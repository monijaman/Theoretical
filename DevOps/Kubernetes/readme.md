# Kubernetes: From Your First Pod to Operating a Service

Learn Kubernetes by deploying a small web application, changing it, breaking a rollout, recovering it, and exploring the tools used to operate real services.

This guide connects the concepts to one local lab. You will use **Minikube** for the cluster and **kubectl** to communicate with it. No cloud account is required for the main exercises.

## Start Here

**Before you begin:** Understand basic terminal commands, HTTP, and container images. You should know that an image is a packaged application and that a container is a running instance of it.

**What you will learn:**

- How Kubernetes reconciles desired and observed state.
- How Pods, Deployments, Services, and labels work together.
- How to configure applications, check health, and handle updates.
- How to scale workloads and retain data beyond a Pod's lifetime.
- How access control, networking policies, and production operations fit together.

**Choose a path:**

| Goal | Read and practice |
| --- | --- |
| Get a working application | Sections 1–6 |
| Understand day-to-day changes | Sections 7–10 |
| Learn storage and background work | Sections 11–12 |
| Prepare for operating services | Sections 13–17 |
| Review or troubleshoot | Sections 18–20 |

Examples marked **complete manifest** can be saved and applied after their prerequisites. Examples marked **fragment** belong inside an existing object. Optional exercises are separate from the main application.

Commands assume Bash or a similar shell. Keep practice resources in the `k8s-lab` namespace and use the dedicated Minikube profile shown below.

## Contents

1. [What Kubernetes solves](#1-what-kubernetes-solves)
2. [Understand the cluster](#2-understand-the-cluster)
3. [The objects you will use](#3-the-objects-you-will-use)
4. [Create a local cluster](#4-create-a-local-cluster)
5. [Deploy your first application](#5-deploy-your-first-application)
6. [Access and inspect the application](#6-access-and-inspect-the-application)
7. [Configuration and secrets](#7-configuration-and-secrets)
8. [Health checks and shutdown](#8-health-checks-and-shutdown)
9. [Updates, failures, and rollback](#9-updates-failures-and-rollback)
10. [Resources and autoscaling](#10-resources-and-autoscaling)
11. [Persistent storage and StatefulSets](#11-persistent-storage-and-statefulsets)
12. [Jobs, CronJobs, and DaemonSets](#12-jobs-cronjobs-and-daemonsets)
13. [External routing with Gateway and Ingress](#13-external-routing-with-gateway-and-ingress)
14. [Security and access control](#14-security-and-access-control)
15. [Scheduling and availability](#15-scheduling-and-availability)
16. [Organize and deploy configuration](#16-organize-and-deploy-configuration)
17. [Observability and production operations](#17-observability-and-production-operations)
18. [Troubleshooting workflow](#18-troubleshooting-workflow)
19. [Command reference and cleanup](#19-command-reference-and-cleanup)
20. [Practice projects and review questions](#20-practice-projects-and-review-questions)

## 1. What Kubernetes Solves

Running one container manually is straightforward. Operating many instances creates more questions:

- Which machine should run each instance?
- What happens when an instance exits?
- How do callers find replacement instances?
- How do you release a new version while serving traffic?
- How do you give each workload enough capacity?

Kubernetes provides APIs and controllers for managing these tasks. You describe the desired configuration, and controllers continually work to bring the observed system toward it.

```text
You: "Run two copies of this application."
                       |
                       v
                Deployment controller
                       |
                       v
              ReplicaSet manages Pods
                       |
                       v
                Scheduler selects nodes
                       |
                       v
          Node agents arrange container execution
```

This continuous process is called **reconciliation**. If a managed Pod disappears, its controller can create a replacement. That does not repair a database query, supply missing capacity, or recover lost application data automatically. See [Kubernetes controllers](https://kubernetes.io/docs/concepts/architecture/controller/).

### How it relates to other tools

| Tool | Typical responsibility |
| --- | --- |
| Docker or another image-building tool | Package application code into an image. |
| Container runtime | Run containers on a machine. |
| Kubernetes | Schedule and manage workloads across machines. |
| Terraform | Provision infrastructure such as networks and clusters. |
| CI/CD pipeline | Build, test, and release changes. |

For a small application, a simpler deployment can be appropriate. Kubernetes adds capabilities and operational work; use it when those capabilities solve a real need.

## 2. Understand the Cluster

A **cluster** consists of a control plane and machines called **nodes**. A local lab may place several responsibilities on one machine.

```text
                         kubectl
                            |
                            v
                    Kubernetes API server
                            |
              +-------------+-------------+
              |             |             |
             etcd       controllers    scheduler
              |                           |
              +---------- cluster --------+
                            |
                  +---------+---------+
                  |                   |
              Worker node         Worker node
              kubelet             kubelet
              runtime             runtime
              Pods                Pods
```

| Component | Responsibility |
| --- | --- |
| API server | Receives and validates API requests. |
| etcd | Stores Kubernetes API state. |
| Scheduler | Selects a node for an unscheduled Pod. |
| Controllers | Reconcile objects toward their desired state. |
| kubelet | Node agent that manages Pod execution on its node. |
| Container runtime | Pulls images and runs containers. |
| Networking implementation | Provides Pod connectivity and related networking behavior. |

The scheduler does not create extra machines. Node provisioning and autoscaling require additional infrastructure integration.

## 3. The Objects You Will Use

| Object | What it represents | Example |
| --- | --- | --- |
| Namespace | A named scope for resources. | `k8s-lab` |
| Pod | One or more containers sharing networking and declared volumes. | One web-server instance. |
| Deployment | Desired replicas and rollout behavior for interchangeable Pods. | Two web-server replicas. |
| ReplicaSet | A controller maintaining a desired number of matching Pods. | Created and managed by a Deployment. |
| Service | A stable network entry point for selected endpoints. | `web` routes to the web Pods. |
| ConfigMap | Non-secret configuration. | A sample HTML page. |
| Secret | Data intended for sensitive configuration. | A database credential. |
| PersistentVolumeClaim | A request for persistent storage. | A 1 GiB lab volume. |
| Job | Work intended to complete. | A report-generation task. |
| CronJob | A schedule for creating Jobs. | A periodic report. |
| StatefulSet | Workloads needing stable identities and storage associations. | A stateful service managed by an operator. |
| DaemonSet | A Pod on each eligible node. | A node-level monitoring agent. |

### Read a YAML manifest

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: k8s-lab
```

- `apiVersion` selects an API group/version.
- `kind` selects the resource type.
- `metadata` identifies and labels the object.
- Many objects also have `spec`, which describes desired behavior.
- `status` is generally reported by the system rather than authored in your manifest.

YAML indentation matters. Kubernetes also validates the schema: syntactically valid YAML can still contain fields that do not belong to the chosen resource.

### Labels connect objects

A Pod can have `app: web`, and a Service can select `app: web`. Matching is based on labels, not on similar object names. A mismatched selector is a common reason a Service has no usable endpoints.

**Checkpoint:** Explain why a Deployment and a Service can have different names and still work together.

## 4. Create a Local Cluster

Install a compatible container or VM environment, [Minikube](https://minikube.sigs.k8s.io/docs/start/), and [kubectl](https://kubernetes.io/docs/tasks/tools/). For the commands below, Docker must be installed and running.

Start a dedicated profile:

```bash
minikube start -p k8s-tutorial --driver=docker --cpus=2 --memory=4096
kubectl config use-context k8s-tutorial
kubectl config current-context
kubectl cluster-info
kubectl get nodes
```

The memory setting requests roughly 4 GiB for this learning cluster. Leave enough resources for your host system. Image downloads require internet access.

Expected result: the node eventually reports `Ready`. If it does not, inspect Minikube status and logs before continuing:

```bash
minikube status -p k8s-tutorial
minikube logs -p k8s-tutorial
```

Create a directory for the manifests:

```bash
mkdir kubernetes-lab
cd kubernetes-lab
```

Create `namespace.yaml` using the Namespace manifest in section 3, then apply it:

```bash
kubectl apply -f namespace.yaml
kubectl get namespace k8s-lab
```

The examples explicitly use `-n k8s-lab` so the target namespace remains visible. Before running commands against another environment, verify the context again.

## 5. Deploy Your First Application

We will serve a small HTML page with Nginx. The page comes from a ConfigMap, two replicas are managed by a Deployment, and a Service connects callers to them.

Save this **complete manifest** as `web.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-content
  namespace: k8s-lab
data:
  index.html: |
    <!doctype html>
    <html lang="en">
      <head><title>Kubernetes Lab</title></head>
      <body>
        <h1>Hello from Kubernetes!</h1>
        <p>Version 1 of our practice page.</p>
      </body>
    </html>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: k8s-lab
spec:
  replicas: 2
  revisionHistoryLimit: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      automountServiceAccountToken: false
      terminationGracePeriodSeconds: 30
      containers:
        - name: nginx
          image: nginx:1.28-alpine
          ports:
            - name: http
              containerPort: 80
          resources:
            requests:
              cpu: 100m
              memory: 64Mi
            limits:
              cpu: 500m
              memory: 128Mi
          startupProbe:
            httpGet:
              path: /
              port: http
            periodSeconds: 2
            failureThreshold: 30
          readinessProbe:
            httpGet:
              path: /
              port: http
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /
              port: http
            periodSeconds: 10
            failureThreshold: 3
          volumeMounts:
            - name: content
              mountPath: /usr/share/nginx/html
              readOnly: true
      volumes:
        - name: content
          configMap:
            name: web-content
---
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: k8s-lab
spec:
  type: ClusterIP
  selector:
    app: web
  ports:
    - name: http
      port: 80
      targetPort: http
```

### Follow the connections

| Setting | Why it is present |
| --- | --- |
| `replicas: 2` | Requests two application Pods. |
| Deployment selector and Pod labels | Connect the controller to its Pods. |
| Service selector | Connects the Service to matching Pods. |
| `port: 80` | The Service's listening port. |
| `targetPort: http` | Resolves the named container port `http`, which is 80. |
| ConfigMap volume | Makes the HTML available inside the container. |
| Readiness probe | Checks whether the instance should receive normal Service traffic. |
| Resource requests | Help the scheduler place the Pod. |

`containerPort` documents/names a port; it does not make the application listen or expose it to the internet. Nginx itself listens on port 80 in this image.

### Apply and inspect

```bash
kubectl apply -f web.yaml
kubectl rollout status deployment/web -n k8s-lab --timeout=120s
kubectl get deployments,replicasets,pods,services -n k8s-lab
```

The Deployment should eventually show two ready replicas. Initial image downloads can take time. If the rollout times out, use the troubleshooting workflow rather than repeatedly applying unchanged YAML.

## 6. Access and Inspect the Application

### Access from your computer

In one terminal:

```bash
kubectl port-forward -n k8s-lab service/web 8080:80
```

Keep that command running. Open `http://localhost:8080` in a browser or, from another terminal, run:

```bash
curl http://localhost:8080
```

You should see the HTML containing `Hello from Kubernetes!`.

Port forwarding is a development/debugging tunnel. It does not create public ingress or demonstrate load balancing across every replica. If its selected Pod disappears during an exercise, restart the port-forward command.

### Access from another Pod

Run a temporary client inside the same namespace:

```bash
kubectl run http-check -n k8s-lab --rm -i --restart=Never \
  --image=busybox:1.37 -- wget -qO- http://web
```

`web` resolves to the Service through cluster DNS. From another namespace, use `web.k8s-lab`. A typical fully qualified name is `web.k8s-lab.svc.cluster.local`; the cluster domain can be configured differently.

### Inspect labels and endpoints

```bash
kubectl get pods -n k8s-lab -l app=web --show-labels
kubectl get endpointslices -n k8s-lab -l kubernetes.io/service-name=web
kubectl describe service web -n k8s-lab
kubectl logs -n k8s-lab -l app=web --all-containers=true --prefix --tail=30
```

### Compare Service types

| Type | Typical use |
| --- | --- |
| `ClusterIP` | Access within the cluster. |
| `NodePort` | Exposes a port on nodes, subject to networking/firewall rules. |
| `LoadBalancer` | Requests an external load balancer from a supported integration. |
| `ExternalName` | Provides a DNS alias rather than selecting Pod endpoints. |

A `LoadBalancer` Service does not guarantee a public address on every local cluster. The platform must supply the load-balancer implementation. See [Service networking](https://kubernetes.io/docs/concepts/services-networking/service/).

**Checkpoint:** Trace a request from `http-check` through DNS and the Service to Nginx.

[Back to contents](#contents)

## 7. Configuration and Secrets

### Update the ConfigMap

In `web.yaml`, change the HTML text from `Version 1` to `Version 2`, then run:

```bash
kubectl apply -f web.yaml
```

Projected ConfigMap volume contents update eventually. They do not automatically restart the Deployment. For a predictable lab refresh:

```bash
kubectl rollout restart deployment/web -n k8s-lab
kubectl rollout status deployment/web -n k8s-lab --timeout=120s
```

Refresh the page, restarting port forwarding if necessary. Applications that cache configuration may need an explicit reload or restart even after mounted files change. ConfigMap values injected through environment variables also need new containers to receive changes. A `subPath` mount has different update behavior from the directory mount used here.

### Example: environment variable from configuration

This is a **container fragment** for an application that reads `LOG_LEVEL`:

```yaml
env:
  - name: LOG_LEVEL
    valueFrom:
      configMapKeyRef:
        name: app-settings
        key: log-level
```

The referenced ConfigMap must exist in the Pod's namespace and contain `log-level`. Nginx does not automatically change its logging behavior just because this custom environment variable is set.

### Secrets are not encrypted by base64

A Secret is designed to hold sensitive configuration. Base64 encoding in its API representation is reversible and is not encryption. Limit API access and configure appropriate encryption and secret-delivery mechanisms. See [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/).

For a **disposable demo value**, create a Secret:

```bash
kubectl create secret generic demo-credentials -n k8s-lab \
  --from-literal=username=demo \
  --from-literal=password=not-a-real-password
```

Inspect metadata without printing values:

```bash
kubectl describe secret demo-credentials -n k8s-lab
```

An application can reference it with this **container fragment**:

```yaml
env:
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: demo-credentials
        key: password
```

Use an approved secret workflow for real credentials instead of embedding them in source files or shell history. A Secret reference supplies a value; it does not create a database or rotate the application's connections.

## 8. Health Checks and Shutdown

Three probes answer different questions:

| Probe | Question | Effect after configured failures |
| --- | --- | --- |
| Startup | Has initialization completed? | Restarts the container; other probes wait until startup succeeds. |
| Readiness | Can this instance serve traffic? | Marks the Pod unready for normal Service routing. |
| Liveness | Is the container stuck in a state a restart could fix? | Restarts the container. |

Readiness failure does not itself restart a container. Probe timing and thresholds determine when actions occur. See [probe behavior](https://kubernetes.io/docs/concepts/workloads/pods/probes/).

The web lab uses `/` for all three because it is a small static server. A backend commonly exposes dedicated endpoints with different logic. Avoid tying liveness directly to a shared database outage, which can cause every replica to restart without fixing the database.

### Shutdown is a joint responsibility

Kubernetes gives terminating workloads a grace period, while the application must handle its stop signal and finish or safely abandon active work.

A backend's shutdown flow typically includes:

1. Indicate that it is no longer ready for new traffic.
2. Stop accepting new application work.
3. Finish in-flight requests within a bounded time.
4. Close database and broker connections.
5. Exit before the termination deadline.

A `preStop` hook consumes time from the termination grace period. Adding a sleep does not guarantee that all network paths have drained. Test shutdown under traffic and preserve retry/idempotency behavior for interrupted work.

## 9. Updates, Failures, and Rollback

### Understand a rolling update

The lab has:

```yaml
maxSurge: 1
maxUnavailable: 0
```

During a rollout, the Deployment can add one extra replica and aims to keep the desired count available. This requires enough cluster capacity. It does not guarantee that every request succeeds or that a broken readiness check detects an application bug.

### Deliberately break an image rollout

In this local lab only, set a nonexistent image tag:

```bash
kubectl set image deployment/web nginx=nginx:k8s-lab-nonexistent -n k8s-lab
kubectl rollout status deployment/web -n k8s-lab --timeout=30s
kubectl get pods -n k8s-lab
kubectl get events -n k8s-lab --sort-by=.metadata.creationTimestamp
```

The rollout command should time out. The new Pod will typically report `ErrImagePull` or `ImagePullBackOff`. The old ready replicas should remain because the strategy allows no unavailable replicas during this rollout.

### Recover

```bash
kubectl rollout history deployment/web -n k8s-lab
kubectl rollout undo deployment/web -n k8s-lab
kubectl rollout status deployment/web -n k8s-lab --timeout=120s
```

A Deployment rollback restores an earlier Pod template when its revision is retained. It does not restore changed databases, external effects, or older ConfigMap contents. See [Deployment behavior](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/).

The `set image` command changed the live object, not `web.yaml`. Keep source configuration aligned with intended live state. In a GitOps setup, an automated reconciler may overwrite manual changes.

### Observe replacement after Pod deletion

```bash
kubectl get pods -n k8s-lab -l app=web
```

Copy one Pod name and substitute it below:

```bash
kubectl delete pod POD_NAME -n k8s-lab
kubectl get pods -n k8s-lab -l app=web --watch
```

The ReplicaSet creates a replacement with a new name. Stop watching with Ctrl+C. This tests Pod replacement, not machine failure or database recovery.

## 10. Resources and Autoscaling

### Requests versus limits

| Setting | Meaning |
| --- | --- |
| CPU request | Used for scheduling and CPU allocation decisions under contention. |
| Memory request | Used when deciding whether a node can fit the Pod. |
| CPU limit | Bounds CPU use through throttling. |
| Memory limit | Can cause an out-of-memory termination when exceeded. |

`100m` means one tenth of a CPU. `64Mi` means 64 mebibytes. Requests are not a measurement of actual usage, and a memory request is not a hard cap.

The lab values are starting points for practice. Measure startup and steady-state usage before sizing a real workload.

### Scale manually

```bash
kubectl scale deployment/web -n k8s-lab --replicas=3
kubectl get pods -n k8s-lab -l app=web
```

This changes the live replica count. Reapplying the original manifest with `replicas: 2` can restore the declared count.

### Add a Horizontal Pod Autoscaler

Enable the resource metrics API in the Minikube profile:

```bash
minikube addons enable metrics-server -p k8s-tutorial
kubectl top nodes
kubectl top pods -n k8s-lab
```

Metrics may take time to become available. Investigate persistent errors before adding the HPA.

Save this **complete manifest** as `hpa.yaml`:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web
  namespace: k8s-lab
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 2
  maxReplicas: 4
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 120
```

```bash
kubectl apply -f hpa.yaml
kubectl get hpa web -n k8s-lab --watch
```

The target is 60% of the CPU request, not 60% of the node. With a `100m` request, that corresponds to roughly `60m` per Pod on average. The HPA adjusts replicas; it does not add nodes. See [horizontal autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/).

A small static page may not generate enough CPU use to trigger scaling. Do not assume a broken HPA merely because replicas stay at two. Validate with a controlled workload and observe metrics.

When an HPA manages replica count, avoid having another automation loop repeatedly set a competing count. To return to manual control in this lab:

```bash
kubectl delete hpa web -n k8s-lab
kubectl scale deployment/web -n k8s-lab --replicas=2
```

[Back to contents](#contents)

## 11. Persistent Storage and StatefulSets

A container's writable layer is not durable application storage. An `emptyDir` volume survives container restarts within a Pod but is tied to that Pod's lifetime. Persistent volumes have a lifecycle managed separately from a particular Pod.

### Storage vocabulary

| Term | Meaning |
| --- | --- |
| PersistentVolume (PV) | A storage resource available to the cluster. |
| PersistentVolumeClaim (PVC) | A workload's request for storage. |
| StorageClass | Provisioning configuration, such as the driver and parameters. |
| CSI driver | Integration between Kubernetes and a storage system. |
| Reclaim policy | What happens to the backing volume when its claim is released. |

A PVC is not a backup. Retention, availability across nodes, and deletion behavior depend on the storage implementation and policy. See [persistent volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/).

### Lab: keep a file after replacing a Pod

Check that a default StorageClass exists:

```bash
kubectl get storageclass
```

The following **complete manifest** assumes dynamic provisioning through that default class. Save it as `storage.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: notes
  namespace: k8s-lab
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: storage-demo
  namespace: k8s-lab
spec:
  automountServiceAccountToken: false
  containers:
    - name: tools
      image: busybox:1.37
      command: ["sh", "-c", "sleep 86400"]
      volumeMounts:
        - name: notes
          mountPath: /data
  volumes:
    - name: notes
      persistentVolumeClaim:
        claimName: notes
```

```bash
kubectl apply -f storage.yaml
kubectl wait -n k8s-lab --for=condition=Ready pod/storage-demo --timeout=120s
kubectl get pvc -n k8s-lab
kubectl exec -n k8s-lab storage-demo -- sh -c 'echo "Persistent hello" > /data/note.txt'
kubectl exec -n k8s-lab storage-demo -- cat /data/note.txt
```

Delete only the Pod, then recreate it using the same claim:

```bash
kubectl delete pod storage-demo -n k8s-lab
kubectl apply -f storage.yaml
kubectl wait -n k8s-lab --for=condition=Ready pod/storage-demo --timeout=120s
kubectl exec -n k8s-lab storage-demo -- cat /data/note.txt
```

The file should still contain `Persistent hello`. This standalone Pod is intentional for the storage experiment; unlike the web Deployment, no workload controller replaces it automatically.

`ReadWriteOnce` generally restricts read-write mounting to a single node, not necessarily a single Pod. It does not provide database-level concurrency protection.

Local Minikube storage is suitable for learning, not evidence of disaster recovery. Deleting the profile can remove its data.

### When to use StatefulSet

A StatefulSet supplies stable replica identities and can associate a claim with each replica. It helps when instances are not interchangeable.

It does not configure PostgreSQL replication, elect a database primary, or test backups by itself. For a real stateful system, understand its operator or management tooling, failover behavior, storage constraints, and restore procedure.

## 12. Jobs, CronJobs, and DaemonSets

### Run a task with a Job

Save as `job.yaml`, a **complete manifest**:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: hello-job
  namespace: k8s-lab
spec:
  backoffLimit: 2
  activeDeadlineSeconds: 60
  ttlSecondsAfterFinished: 300
  template:
    spec:
      restartPolicy: Never
      automountServiceAccountToken: false
      containers:
        - name: task
          image: busybox:1.37
          command: ["sh", "-c", "echo 'Job started'; date; echo 'Job finished'"]
```

```bash
kubectl apply -f job.yaml
kubectl wait -n k8s-lab --for=condition=Complete job/hello-job --timeout=90s
kubectl logs -n k8s-lab job/hello-job
```

A Job can retry work. Design external side effects so a repeated attempt does not corrupt data or duplicate an operation. The cleanup TTL removes finished Jobs after the configured delay; collect logs before then or use centralized logging.

### Schedule a CronJob

Save as `cronjob.yaml`, a **complete manifest**:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: clock
  namespace: k8s-lab
spec:
  schedule: "*/5 * * * *"
  timeZone: "Etc/UTC"
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 60
  successfulJobsHistoryLimit: 1
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      backoffLimit: 1
      activeDeadlineSeconds: 60
      template:
        spec:
          restartPolicy: Never
          automountServiceAccountToken: false
          containers:
            - name: clock
              image: busybox:1.37
              command: ["sh", "-c", "date"]
```

```bash
kubectl apply -f cronjob.yaml
kubectl get cronjobs,jobs -n k8s-lab
```

The schedule requests a run every five minutes. `Forbid` avoids overlapping Jobs from this CronJob, but scheduling is not an exactly-once guarantee. Keep the task idempotent.

### DaemonSet

Use a DaemonSet for node-level work, such as an agent that must run on every eligible node. It is different from “run three copies”: its placement follows the eligible nodes rather than a fixed replica count.

## 13. External Routing with Gateway and Ingress

Port forwarding was enough for the local exercises. Public or shared application access usually needs a routing layer and DNS/TLS configuration.

### Gateway API

Gateway API separates infrastructure ownership from application routes:

```text
GatewayClass -> Gateway listener -> HTTPRoute -> Service -> Pods
```

The API definitions and a compatible controller must be installed. Kubernetes recommends Gateway API for new routing capabilities; Ingress remains available but its API is frozen. See [Ingress and Gateway guidance](https://kubernetes.io/docs/concepts/services-networking/ingress/).

This **optional route example** assumes a controller-managed Gateway named `shared-gateway` already exists in `k8s-lab`, has an HTTP listener, and accepts this route:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web
  namespace: k8s-lab
spec:
  parentRefs:
    - name: shared-gateway
  hostnames:
    - web.example.com
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: web
          port: 80
```

This route alone does not install a controller, create the Gateway, publish DNS, or issue a certificate. Use the chosen implementation's setup instructions, then inspect Gateway and route status conditions.

### Ingress

You may also encounter `networking.k8s.io/v1` Ingress resources. They need an Ingress controller. `ingressClassName` selects the implementation, and controller-specific annotations are not portable.

For HTTPS, configure the listener, certificate, hostname, and certificate renewal workflow. A `tls` field or Secret name does not independently obtain a certificate.

## 14. Security and Access Control

Think about three separate boundaries:

1. Who may call the Kubernetes API?
2. Which workloads may communicate over the network?
3. What privileges does each container have?

### Service accounts and RBAC

RBAC means role-based access control. A Role grants namespaced API permissions, and a RoleBinding associates them with an identity. This **complete optional manifest** grants a service account read-only Pod inspection in the lab namespace:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: pod-reader
  namespace: k8s-lab
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: k8s-lab
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-reader
  namespace: k8s-lab
subjects:
  - kind: ServiceAccount
    name: pod-reader
    namespace: k8s-lab
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: pod-reader
```

Save it as `rbac.yaml`, apply it, and check permissions using the local cluster administrator:

```bash
kubectl apply -f rbac.yaml
kubectl auth can-i list pods -n k8s-lab --as=system:serviceaccount:k8s-lab:pod-reader
kubectl auth can-i delete pods -n k8s-lab --as=system:serviceaccount:k8s-lab:pod-reader
```

Expect `yes` for listing and `no` for deletion unless other bindings grant more permissions. The `--as` checks require impersonation permission. A workload uses this identity by setting `serviceAccountName`; creating the account does not assign it to existing Pods. See [RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/).

The web lab disables automatic service-account token mounting because serving HTML does not require Kubernetes API access.

### NetworkPolicy

NetworkPolicy controls selected Pod traffic only when the cluster network implementation enforces it. Do not assume an applied policy is enforced by every Minikube network configuration.

This **optional complete policy** allows incoming TCP port 80 traffic to web Pods only from Pods labeled `access: web` in the same namespace, subject to NetworkPolicy semantics and other additive policies:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-from-approved-clients
  namespace: k8s-lab
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              access: web
      ports:
        - protocol: TCP
          port: 80
```

On a policy-capable practice cluster, save as `network-policy.yaml`, apply it, then compare:

```bash
kubectl apply -f network-policy.yaml
kubectl run allowed-client -n k8s-lab --rm -i --restart=Never \
  --labels=access=web --image=busybox:1.37 -- wget -T 5 -qO- http://web
kubectl run other-client -n k8s-lab --rm -i --restart=Never \
  --image=busybox:1.37 -- wget -T 5 -qO- http://web
```

The labeled client should work; the other should be blocked if no other policy allows it. Port forwarding is not a substitute for this Pod-to-Pod test. This ingress policy does not restrict egress. An external routing controller would also need appropriate access. See [NetworkPolicy behavior](https://kubernetes.io/docs/concepts/services-networking/network-policies/).

### Container privileges

For a suitably built application image, a hardened **container fragment** can look like:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 10001
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop: ["ALL"]
  seccompProfile:
    type: RuntimeDefault
```

Do not paste this blindly into the stock Nginx lab: its user, writable directories, startup behavior, and port must support these settings. Build or choose a compatible image and mount explicitly required writable locations.

Also control image provenance, dependency updates, API access, and Pod admission policy. A namespace by itself is not a complete tenant security boundary.

## 15. Scheduling and Availability

### Placement concepts

| Mechanism | Purpose |
| --- | --- |
| `nodeSelector` / node affinity | Place Pods on nodes matching requirements or preferences. |
| Pod affinity / anti-affinity | Influence placement relative to other Pods. |
| Topology spread constraints | Spread replicas across failure domains such as nodes or zones. |
| Taints and tolerations | Restrict which Pods may schedule onto particular nodes. |

A toleration permits scheduling onto a tainted node; it does not guarantee that placement. Constraints that no node satisfies leave Pods pending.

Two replicas on one local node help test container and Pod behavior, but cannot survive losing that node. Production availability needs appropriate node/zone capacity and application design.

### PodDisruptionBudget

This **optional complete manifest** requests at least one available web replica during supported voluntary evictions:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web
  namespace: k8s-lab
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: web
```

A PDB is not protection against every failure. It does not prevent a machine from failing, govern Deployment rolling-update strategy, or necessarily stop direct Pod deletion. Maintenance may be blocked when the budget cannot be satisfied.

### Node maintenance

`cordon` stops new scheduling onto a node. `drain` attempts to evict workloads for maintenance. `uncordon` makes the node schedulable again.

Practice maintenance only after understanding spare capacity, storage placement, disruption budgets, and workload controllers. Draining the only node in this lab will not demonstrate a highly available service.

## 16. Organize and Deploy Configuration

Keep related manifests in version control and separate shared configuration from environment-specific values.

```text
infrastructure/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/
    ├── dev/
    └── production/
```

### Plain YAML, Kustomize, and Helm

| Approach | Useful when |
| --- | --- |
| Plain YAML | A small set of explicit manifests is easy to maintain. |
| Kustomize | You want overlays and patches over a common base. |
| Helm | You need a parameterized package of related Kubernetes resources. |

Choose one clear ownership model for each resource. Multiple tools continually changing the same field can conflict.

### Review before applying

For the lab:

```bash
kubectl apply --dry-run=client -f web.yaml
kubectl apply --dry-run=server -f web.yaml
kubectl diff -f web.yaml
kubectl apply -f web.yaml
kubectl rollout status deployment/web -n k8s-lab --timeout=120s
```

Client dry-run does not prove the cluster will accept a resource. Server dry-run exercises API validation and applicable admission behavior without persisting it, but does not prove the application will become healthy. `kubectl diff` exits with code 1 when differences exist; that is not necessarily a command failure.

For production, prefer immutable image references such as digests, review environment changes, and verify the application after rollout. A successful API write is not the same as a successful release.

### GitOps

A GitOps controller compares repository configuration with the cluster and reconciles differences. It does not build your application automatically, and its sync/delete behavior must be configured deliberately.

Use a reviewed change to update the desired image reference. Emergency manual changes need a follow-up source change so reconciliation does not undo the intended recovery.

## 17. Observability and Production Operations

### Start with user-facing signals

| Signal | What it helps answer |
| --- | --- |
| Request rate | How much work arrives? |
| Error rate | Which operations fail? |
| Latency percentiles | How slow are typical and tail requests? |
| CPU/memory and queue depth | Are workloads approaching capacity? |
| Logs | What happened during a particular operation? |
| Traces | Where did time go across services? |

`kubectl top` provides resource usage, not a complete observability platform. Collect application metrics, centralize logs, and preserve useful trace context. Add alerts with a clear response action.

### Production readiness questions

- Can the workload start, become ready, and shut down under realistic traffic?
- What happens when a dependency times out or a node disappears?
- Are resource settings based on measurements?
- Are secrets, permissions, and network access appropriately scoped?
- Is the image reproducible and maintained?
- Can the team roll back application changes without breaking the data model?
- Have backups actually been restored and checked?
- Are certificate renewal, upgrades, and incident ownership defined?

Managed Kubernetes reduces some control-plane work, but the team still owns application behavior, access, capacity, and data recovery.

For deeper examples, see [Observability & Reliability](../../Backend-guru/Observability%20%26%20Reliability/readme.md) and [Production Simulation](../../Backend-guru/Production%20Simulation/readme.md).

## 18. Troubleshooting Workflow

Start with the observed symptom, then narrow the failing layer. Avoid deleting resources before collecting the evidence needed to understand the problem.

### Step 1: Confirm your target

```bash
kubectl config current-context
kubectl get nodes
kubectl get pods -n k8s-lab -o wide
```

### Step 2: Read events and object details

```bash
kubectl get events -n k8s-lab --sort-by=.metadata.creationTimestamp
kubectl describe deployment web -n k8s-lab
kubectl describe pod POD_NAME -n k8s-lab
```

Replace `POD_NAME` with the actual name from `get pods`. Events are useful evidence, but are not a permanent incident history.

### Step 3: Inspect logs

```bash
kubectl logs POD_NAME -n k8s-lab -c nginx --tail=100
kubectl logs POD_NAME -n k8s-lab -c nginx --previous --tail=100
```

`--previous` reads logs from a previous terminated container instance when available. It is useful after a restart and may have nothing to show for a newly created container.

### Step 4: Test networking from inside the cluster

```bash
kubectl get service web -n k8s-lab
kubectl get endpointslices -n k8s-lab -l kubernetes.io/service-name=web
kubectl run debug-web -n k8s-lab --rm -i --restart=Never \
  --labels=access=web --image=busybox:1.37 -- wget -T 5 -qO- http://web
```

The label also permits this client under the optional lab NetworkPolicy. Check DNS, matching labels, readiness, Service ports, and policies independently.

### Common symptoms

| Symptom | Likely checks |
| --- | --- |
| `Pending` | Capacity, placement constraints, unbound PVCs, and scheduler events. |
| `ImagePullBackOff` | Image name/tag, registry reachability, credentials, and pull limits. |
| `CrashLoopBackOff` | Previous logs, exit code, configuration, application startup, and liveness behavior. |
| `OOMKilled` | Memory usage, limit, startup needs, and possible leaks. |
| Running but not ready | Readiness endpoint and initialization/dependency status. |
| Service has no endpoints | Selector mismatch or Pods not ready. |
| PVC stays pending | StorageClass, provisioner, capacity, and delayed binding requirements. |
| HPA shows unknown metrics | Metrics API and resource requests. |
| Gateway/Ingress gives no route | Controller, class/listener, route status, backend Service, and hostname. |
| Access denied by API | Current identity, namespace, and RBAC permissions. |

`CrashLoopBackOff` is a retry/backoff symptom, not the root cause. A Pod can be `Running` while its application is not ready or useful.

[Back to contents](#contents)

## 19. Command Reference and Cleanup

| Command | Purpose |
| --- | --- |
| `kubectl get` | List objects and brief status. |
| `kubectl describe` | Inspect object details and related events. |
| `kubectl logs` | Read container output. |
| `kubectl exec` | Run a command in a container that has the required executable. |
| `kubectl apply -f FILE` | Create or update declarative resources. |
| `kubectl diff -f FILE` | Compare the intended configuration with live resources. |
| `kubectl rollout status` | Observe Deployment rollout progress. |
| `kubectl rollout undo` | Restore a retained rollout revision. |
| `kubectl scale` | Change the desired replica count. |
| `kubectl top` | Read resource metrics when supported. |
| `kubectl auth can-i` | Check an API permission. |
| `kubectl delete` | Delete selected resources. |

### Stop without deleting the local cluster

Stop any port-forward process with Ctrl+C, then:

```bash
minikube stop -p k8s-tutorial
```

Restart it later with `minikube start -p k8s-tutorial`.

### Remove the lab resources

Verify the context first. This deletes the namespace and its resources, including PVCs; backing storage deletion depends on the reclaim policy:

```bash
kubectl config current-context
kubectl delete namespace k8s-lab
```

If you are finished with the entire disposable cluster:

```bash
minikube delete -p k8s-tutorial
```

This deletes that Minikube profile and can remove its local storage. Keep your manifests; keep any data you need outside the disposable lab before cleanup.

## 20. Practice Projects and Review Questions

### Project 1: Operate the web lab

Deploy it, access it, update the page, break an image rollout, and recover. Record the command and evidence used at each step.

### Project 2: Add a backend

Containerize a small API with startup, readiness, and liveness endpoints. Supply configuration through a ConfigMap and a Secret. Test termination while a request is in flight.

### Project 3: Measure scaling

Generate a bounded, realistic workload. Watch CPU, request latency, and replica count together. Explain whether adding replicas helps or moves pressure to a shared dependency.

### Project 4: Test failure and recovery

Use a multi-node practice cluster. Spread replicas, interrupt one workload, and measure recovery. Separately restore application data from a backup and verify its contents.

### Questions to answer without memorizing commands

- How do a Deployment, ReplicaSet, Pod, and Service relate?
- Why can a Service exist while no request reaches the application?
- What changes when readiness fails versus liveness fails?
- Why does a ConfigMap update not necessarily restart a Pod?
- What is the difference between a CPU request and a CPU limit?
- Why can an HPA create more replicas that remain pending?
- Why is a PVC not a backup?
- What does a StatefulSet provide, and what must a database still manage?
- How do RBAC and NetworkPolicy solve different problems?
- Why do two replicas on one node not provide node-failure tolerance?
- What can a Deployment rollback restore, and what can it not restore?
- How would you prove that a release is healthy from a user's perspective?

You understand the fundamentals when you can trace a request, explain the desired state, and use evidence to diagnose why the observed behavior differs.

[Back to contents](#contents)
