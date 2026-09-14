# Terraform: A Practical Learning Guide

Terraform lets you describe infrastructure in configuration files and use those files to create, change, and remove resources. Instead of remembering which settings you clicked in a cloud console, you keep a reviewable description of what should exist.

This guide starts with a local exercise, then connects the same workflow to AWS and team projects. You do not need a cloud account for the first exercise.

## Start Here

**Who this is for:** Developers who want to understand infrastructure as code and begin managing infrastructure with Terraform.

**Before you begin:** Be comfortable creating files, running terminal commands, and using Git. Basic cloud knowledge helps with the AWS example, but it is not needed for the local lab.

**How to use this guide:**

- **New to Terraform?** Read sections 1–4 and complete the local lab.
- **Ready for cloud infrastructure?** Continue with variables, dependencies, and the AWS example.
- **Working with a team?** Focus on state, modules, environment separation, and the review workflow.

The examples below are files for you to create in separate practice directories. Alternative examples are labeled; do not combine every code block into one configuration. Shell commands assume Bash or a similar terminal.

## Contents

1. [What Terraform does](#1-what-terraform-does)
2. [The building blocks](#2-the-building-blocks)
3. [Install and check your tools](#3-install-and-check-your-tools)
4. [First lab: create a local file](#4-first-lab-create-a-local-file)
5. [Variables, locals, and outputs](#5-variables-locals-and-outputs)
6. [Resources, data sources, and dependencies](#6-resources-data-sources-and-dependencies)
7. [AWS example: a private S3 bucket](#7-aws-example-a-private-s3-bucket)
8. [State and remote storage](#8-state-and-remote-storage)
9. [Create several resources with for_each](#9-create-several-resources-with-for_each)
10. [Reuse configuration with modules](#10-reuse-configuration-with-modules)
11. [Separate environments and use Git](#11-separate-environments-and-use-git)
12. [Drift, imports, and renaming](#12-drift-imports-and-renaming)
13. [A practical team workflow](#13-a-practical-team-workflow)
14. [Troubleshooting](#14-troubleshooting)
15. [Command reference](#15-command-reference)
16. [Practice projects and questions](#16-practice-projects-and-questions)

## 1. What Terraform Does

Imagine setting up the same application environment three times: development, staging, and production. Each environment needs storage, networking, and permissions. Doing everything manually makes differences easy to introduce and hard to explain later.

With Terraform, you describe the desired resources in files. Terraform uses providers to inspect and change the corresponding systems.

```text
Configuration files + recorded state + provider observations
                             |
                             v
                      Proposed plan
                             |
                        Review changes
                             |
                             v
                            Apply
                             |
                             v
                Updated resources and state
```

This is called **infrastructure as code**, often shortened to **IaC**. Configuration can be reviewed in pull requests, reused, and tracked over time.

Terraform is **declarative**: you describe the desired result. For example, “this bucket should exist with these settings.” Terraform determines the actions and dependency order needed to work toward that result. See the [configuration language overview](https://developer.hashicorp.com/terraform/language).

### Where it fits

| Tool or approach | Typical responsibility |
| --- | --- |
| Terraform | Provision and manage infrastructure resources through provider APIs. |
| Docker | Package and run an application in containers. |
| Kubernetes | Schedule and operate container workloads. |
| Application deployment pipeline | Build, test, and release application code. |

These responsibilities can overlap. A common setup uses Terraform to create infrastructure and a separate deployment workflow to release the application.

**Checkpoint:** Explain the difference between describing a server and deploying your application onto it.

## 2. The Building Blocks

Terraform configuration commonly uses **HCL**, HashiCorp Configuration Language. Files normally end in `.tf`.

| Term | Plain-language meaning | Example |
| --- | --- | --- |
| Provider | A plugin that knows how to interact with a system. | AWS or the local filesystem. |
| Resource | An object Terraform manages. | An S3 bucket or a local file. |
| Data source | A way to read information without managing that object's lifecycle. | The identity of the authenticated AWS account. |
| Variable | An input supplied to a configuration. | An environment name. |
| Local value | A named expression calculated within a module. | Common resource tags. |
| Output | A value exposed by a module. | A bucket name. |
| State | Terraform's record connecting configuration addresses to managed objects. | A resource address mapped to a bucket ID. |
| Backend | Configuration for where state is stored and associated behavior. | Local disk or S3. |
| Module | A collection of Terraform configuration files in one directory. | A reusable storage component. |

### Reading a resource block

```hcl
resource "local_file" "welcome" {
  filename = "${path.module}/welcome.txt"
  content  = "Hello from Terraform!\n"
}
```

Read it like this:

- `resource` declares a managed object.
- `local_file` is the resource type supplied by the local provider.
- `welcome` is the name used inside this configuration.
- `local_file.welcome` is its Terraform address.
- `filename` and `content` are arguments for this resource type.
- `${path.module}` inserts the directory containing this module.

The name `welcome` is a Terraform identifier. The actual file is named by the `filename` argument. Changing an identifier and changing the real object's name are different operations.

## 3. Install and Check Your Tools

Install Terraform using the [official installation instructions](https://developer.hashicorp.com/terraform/install) for your operating system, then check:

```bash
terraform version
```

The examples use Terraform **1.10 or newer within the 1.x series**. This is a compatibility floor for the guide, not a claim about the latest release.

You will also need internet access for `terraform init` to download providers. The AWS exercise additionally needs an AWS account, credentials, and permission to manage the demonstrated resources.

## 4. First Lab: Create a Local File

This exercise creates one text file on your machine. It teaches the Terraform lifecycle without creating cloud infrastructure.

### Step 1: Create a practice directory

```bash
mkdir terraform-local-lab
cd terraform-local-lab
```

Create a file named `main.tf`:

```hcl
terraform {
  required_version = ">= 1.10, < 2.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

variable "learner_name" {
  description = "Name to include in the welcome message."
  type        = string
  default     = "Terraform learner"

  validation {
    condition     = length(trimspace(var.learner_name)) > 0
    error_message = "Provide a non-empty learner name."
  }
}

resource "local_file" "welcome" {
  filename        = "${path.module}/welcome.txt"
  content         = "Hello, ${var.learner_name}!\n"
  file_permission = "0644"
}

output "welcome_path" {
  description = "Location of the generated file."
  value       = local_file.welcome.filename
}
```

`required_providers` declares the provider source and acceptable versions. The constraint `~> 2.5` allows versions from 2.5 up to, but not including, 3.0. Terraform records the selected provider version in `.terraform.lock.hcl`.

The [local file resource](https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/file) manages the file at the given path. Use a new practice directory so it does not overwrite a file you already need.

### Step 2: Initialize, format, and validate

```bash
terraform init
terraform fmt
terraform validate
```

| Command | What happens |
| --- | --- |
| `init` | Initializes the working directory and installs required providers. |
| `fmt` | Formats configuration into Terraform's standard style. |
| `validate` | Checks configuration consistency and provider schema usage. |

Validation does not prove cloud permissions, quotas, or deployment success. See [formatting and validation](https://developer.hashicorp.com/terraform/cli/code).

### Step 3: Preview the changes

```bash
terraform plan
```

For this fresh configuration, expect a summary similar to:

```text
Plan: 1 to add, 0 to change, 0 to destroy.
```

No managed file is created by the plan. Read the resource details as well as the summary. Typical plan symbols include:

| Symbol | Meaning |
| --- | --- |
| `+` | Create an object. |
| `~` | Update an object in place. |
| `-` | Destroy an object. |
| `-/+` or `+/-` | Replace an object; the order differs. |

### Step 4: Apply and inspect

```bash
terraform apply
```

Terraform creates a new plan and asks you to confirm it. Enter `yes` after reviewing the proposed actions.

```bash
cat welcome.txt
terraform output welcome_path
terraform state list
```

Expected file contents:

```text
Hello, Terraform learner!
```

The state list should include `local_file.welcome`.

### Step 5: Change the input

Create `terraform.tfvars` in this same directory:

```hcl
learner_name = "Monir"
```

Then run:

```bash
terraform plan
terraform apply
cat welcome.txt
```

The file should now say `Hello, Monir!`. The plan may replace the file to change its contents; the provider decides which changes require replacement.

Run `terraform plan` again. If nothing has changed, expect **No changes**. Repeatedly applying unchanged configuration should converge on the same desired result.

### Step 6: Clean up

While still inside `terraform-local-lab`, run:

```bash
terraform destroy
```

Review the deletion plan and confirm it. Terraform removes the managed file. Your `.tf` configuration remains, and you can use it to create the file again.

**Checkpoint:** Explain why `plan`, `apply`, and `destroy` are separate operations.

[Back to contents](#contents)

## 5. Variables, Locals, and Outputs

Think of a module like a function: variables are inputs, resources describe its managed objects, locals help calculate values, and outputs expose results.

### Supplying variable values

For the local lab, these are alternatives to editing the default:

```bash
terraform plan -var='learner_name=Monir'
```

Or create `practice.tfvars` containing `learner_name = "Monir"` and explicitly load it:

```bash
terraform plan -var-file=practice.tfvars
```

Terraform automatically loads `terraform.tfvars` and files ending in `.auto.tfvars`. A filename such as `practice.tfvars` needs `-var-file`. Keep the same inputs when applying, or save and apply a plan as shown in section 13.

### Calculating local values

As an extension to the local lab, add:

```hcl
locals {
  greeting = "Hello, ${trimspace(var.learner_name)}!"
}
```

Then replace the resource's `content` argument with:

```hcl
content = "${local.greeting}\n"
```

This is an argument replacement inside the existing resource, not another top-level block. A local value gives a useful name to an expression; it is not a separately supplied input.

### Handling sensitive inputs

This declaration is an independent example:

```hcl
variable "database_password" {
  description = "Database password supplied through the deployment environment."
  type        = string
  sensitive   = true
}
```

`sensitive = true` hides values in ordinary plan and apply output. It does **not** automatically remove them from state or encrypt them there. State and saved plans can contain secrets and need restricted access. See [Terraform sensitive data handling](https://developer.hashicorp.com/terraform/language/manage-sensitive-data).

## 6. Resources, Data Sources, and Dependencies

A **resource** manages an object. A **data source** reads information. For example, add this to an AWS configuration with an authenticated provider:

```hcl
data "aws_caller_identity" "current" {}

output "aws_account_id" {
  value = data.aws_caller_identity.current.account_id
}
```

This reads the account identity; it does not create an AWS account.

### References create dependencies

In the AWS exercise below, this reference connects a bucket setting to its bucket:

```hcl
bucket = aws_s3_bucket.uploads.id
```

Terraform can infer that the bucket must exist before configuring that setting. Writing blocks in a particular file order does not control execution order. Independent operations may run concurrently.

Use `depends_on` only when an actual dependency cannot be expressed through normal references. Broad dependencies can make plans less precise and unnecessarily serialize work.

## 7. AWS Example: A Private S3 Bucket

This example creates storage for application uploads. It does not create a public website or configure application access to the bucket.

**Before applying:** Use a practice AWS account or environment and verify its identity. AWS resources and requests can incur charges. The commands below create real resources when you apply them.

### Step 1: Configure credentials

Use an existing AWS profile. If your organization uses IAM Identity Center and the profile is already configured:

```bash
aws sso login --profile terraform-lab
export AWS_PROFILE=terraform-lab
aws sts get-caller-identity
```

Check that the returned account is the intended one. The AWS provider can use supported AWS credential sources; do not put access keys directly into `.tf` files.

### Step 2: Use a separate directory

```bash
mkdir terraform-aws-lab
cd terraform-aws-lab
```

Create `main.tf`:

```hcl
terraform {
  required_version = ">= 1.10, < 2.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for the practice bucket."
  type        = string
  default     = "us-east-1"
}

locals {
  common_tags = {
    Project     = "terraform-learning"
    Environment = "dev"
    ManagedBy   = "Terraform"
  }
}

resource "aws_s3_bucket" "uploads" {
  bucket_prefix = "terraform-learning-uploads-"
  tags          = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

output "bucket_name" {
  description = "Generated name of the private uploads bucket."
  value       = aws_s3_bucket.uploads.id
}
```

### What each resource does

| Resource | Purpose |
| --- | --- |
| `aws_s3_bucket` | Creates the bucket; `bucket_prefix` lets the provider generate a unique name. |
| `aws_s3_bucket_public_access_block` | Blocks public access through the listed ACL and policy mechanisms. |
| `aws_s3_bucket_versioning` | Enables object versions so overwrites do not simply erase prior versions. |
| `aws_s3_bucket_server_side_encryption_configuration` | Explicitly configures default server-side encryption. |

These settings do not replace IAM permissions or a data-retention policy. Versioning can increase storage use. Resource arguments are documented in the [AWS provider reference](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket).

### Step 3: Review and apply

```bash
terraform init
terraform fmt
terraform validate
terraform plan
terraform apply
terraform output bucket_name
```

For a fresh deployment of exactly this example, the plan should contain four resources to add. Investigate unexpected replacements or deletions before proceeding.

### Step 4: Remove the practice resources

In `terraform-aws-lab`, run `terraform destroy` and review the plan. An empty bucket can be removed. If you uploaded data, a versioned bucket may contain old versions and delete markers even when it appears empty; review and remove only disposable lab data before retrying cleanup.

The example intentionally does not set `force_destroy = true`, which would allow Terraform to remove bucket contents during deletion.

[Back to contents](#contents)

## 8. State and Remote Storage

Terraform needs to know which actual object belongs to an address such as `aws_s3_bucket.uploads`. State holds that mapping and other information used during planning and execution.

| File or directory | Purpose | Commit to Git? |
| --- | --- | --- |
| `*.tf` | Desired configuration. | Yes, without embedded secrets. |
| `.terraform.lock.hcl` | Selected provider versions and checksums. | Yes. |
| `.terraform/` | Downloaded components and working-directory metadata. | No. |
| `terraform.tfstate` and backups | Local records of managed objects. | No. |
| Saved plan files | Proposed actions and associated values. | No; protect as deployment artifacts. |

The dependency lock file is not a state lock. It helps select reproducible provider versions. State locking coordinates concurrent operations on the same state.

### Why teams use remote state

Keeping state only on one developer's laptop makes collaboration and recovery difficult. A remote backend gives the team a shared state location. Choose access controls, encryption, version recovery, and supported locking behavior deliberately. See [remote state](https://developer.hashicorp.com/terraform/language/state/remote).

### Example: an existing S3 state bucket

This is an optional addition to the AWS lab, not part of the four-resource example. First provision a **separate** state bucket with access controls, encryption, and versioning through a bootstrap process. It must already exist before this backend is initialized.

Create `backend.tf`, replacing the sample bucket name with your existing state bucket:

```hcl
terraform {
  backend "s3" {
    bucket       = "your-existing-terraform-state-bucket"
    key          = "learning/dev/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
```

`key` identifies the state object within that bucket. `use_lockfile` enables S3-backed state locking. The execution identity needs permissions for both state and lock-file operations; see the [S3 backend documentation](https://developer.hashicorp.com/terraform/language/backend/s3).

If you are moving the existing lab's local state, run:

```bash
terraform init -migrate-state
```

Review the migration prompt and destination. Keep the existing state recoverable until migration is verified. Use ordinary `terraform init` for a fresh configuration with no existing state to migrate.

Do not use the application's uploads bucket as its own state backend: initialization needs the backend before resources are created, and application cleanup should not remove the record used to manage it. Backend settings are separate from AWS provider settings.

## 9. Create Several Resources with for_each

Use `for_each` when similar objects have meaningful, stable names. This is an **alternative local lab**: copy the `terraform` block from section 4 into a new directory, then add:

```hcl
variable "messages" {
  description = "Named welcome messages to write as local files."
  type        = map(string)
  default = {
    api    = "API configuration\n"
    worker = "Worker configuration\n"
  }
}

resource "local_file" "service" {
  for_each = var.messages

  filename        = "${path.module}/${each.key}.txt"
  content         = each.value
  file_permission = "0644"
}

output "service_files" {
  value = {
    for name, file in local_file.service : name => file.filename
  }
}
```

Run the same initialize, validate, plan, and apply workflow. Terraform manages two addresses:

```text
local_file.service["api"]
local_file.service["worker"]
```

`each.key` is the map key and `each.value` is its message. Adding another map entry adds another instance; removing an entry plans to destroy the corresponding file.

`count` identifies instances by numeric indexes. `for_each` identifies them by map keys or set members, which can make changes easier to reason about for named objects. Keys must be known during planning and cannot be sensitive values. See [`for_each`](https://developer.hashicorp.com/terraform/language/meta-arguments/for_each).

## 10. Reuse Configuration with Modules

A module packages a useful responsibility behind inputs and outputs. The directory where you run Terraform is the **root module**. A module it calls is a **child module**.

This is a separate, complete local example. Create this structure:

```text
terraform-module-lab/
├── main.tf
└── modules/
    └── message/
        └── main.tf
```

**`modules/message/main.tf`:**

```hcl
terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

variable "filename" {
  description = "Destination path for the generated message."
  type        = string
}

variable "message" {
  description = "Text to write into the file."
  type        = string
}

resource "local_file" "this" {
  filename        = var.filename
  content         = var.message
  file_permission = "0644"
}

output "path" {
  value = local_file.this.filename
}
```

**Root `main.tf`:**

```hcl
terraform {
  required_version = ">= 1.10, < 2.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

module "api_message" {
  source = "./modules/message"

  filename = "${path.root}/api.txt"
  message  = "Hello from the API module!\n"
}

output "api_message_path" {
  value = module.api_message.path
}
```

Run Terraform from `terraform-module-lab`. `init` discovers the child module; `apply` creates `api.txt`. The resource address is `module.api_message.local_file.this`.

The caller supplies the destination path so multiple calls do not accidentally write to one shared file inside the child module. Run `terraform destroy` in this root directory when finished.

**Checkpoint:** Explain which values belong inside the module and which decisions its caller should control.

## 11. Separate Environments and Use Git

A practical directory structure might look like this:

```text
infrastructure/
├── modules/
│   └── storage/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── backend.tf
│   └── production/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── backend.tf
└── README.md
```

Terraform reads the `.tf` files in the current module directory together. Names such as `variables.tf` organize the code for people; they do not set execution order. Subdirectories are not loaded automatically as part of the root module.

Each environment above should have its own state location and deliberately scoped credentials. Passing a different `.tfvars` file alone does **not** create isolated state. CLI workspaces offer multiple states for a configuration, but workspace names alone do not establish account or permission isolation.

### Example .gitignore

Add suitable patterns to your infrastructure project's `.gitignore`:

```gitignore
**/.terraform/*
*.tfstate
*.tfstate.*
*.tfplan
crash.log
crash.*.log
*.secret.tfvars
*.secret.tfvars.json
```

Commit `.terraform.lock.hcl`. Non-secret variable files may be committed according to the project policy. A file named `production.tfvars` is not automatically safe to commit—review its contents.

## 12. Drift, Imports, and Renaming

### Drift: something changed outside Terraform

Suppose a managed setting is changed manually in the cloud console. A normal plan generally refreshes managed resource information and compares it with configuration. Decide whether the manual change should be reverted or represented in code.

`terraform plan -refresh-only` previews updates to state and outputs based on observed objects. It does not rewrite your configuration. Review the intent before recording changes.

### Import: manage an existing object

Import connects an existing object to a Terraform address. It does not create a copy of that object.

For an existing S3 bucket, in a dedicated configuration with an AWS provider, use:

```hcl
resource "aws_s3_bucket" "existing" {
  bucket = "your-existing-bucket-name"
}

import {
  to = aws_s3_bucket.existing
  id = "your-existing-bucket-name"
}
```

Review `terraform plan` before applying. Terraform may propose configuration changes along with the import; match the desired settings deliberately. Manage a real object at one Terraform address, not independently from several states. See [importing resources](https://developer.hashicorp.com/terraform/language/import).

### Rename: keep the identity mapping

If you rename the local lab resource from `welcome` to `greeting`, also update its references and add:

```hcl
moved {
  from = local_file.welcome
  to   = local_file.greeting
}
```

A moved block records the address change so Terraform can preserve the association with the existing object. Keep the actual resource arguments unchanged if your intent is only to rename the code identifier, then inspect the plan.

## 13. A Practical Team Workflow

Use a pull request to review both the configuration and the proposed infrastructure changes.

1. Format and validate configuration.
2. Create a plan for the intended environment and credentials.
3. Review changes, including replacements, deletions, permissions, and operational impact.
4. Apply the approved plan using a controlled deployment identity.
5. Check application behavior and record the outcome.

An example command sequence is:

```bash
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan -out=reviewed.tfplan
terraform show reviewed.tfplan
```

After review, apply that saved plan:

```bash
terraform apply reviewed.tfplan
```

**A saved plan applies without an additional interactive approval prompt.** Protect the artifact and put the review or approval step before this command. Do not assume an earlier unsaved `terraform plan` is the plan a later `terraform apply` will execute. See [plan behavior](https://developer.hashicorp.com/terraform/cli/commands/plan).

In automation, also serialize applies to the same state, use remote state locking, and make provider upgrades deliberate. `terraform init -upgrade` can select newer provider versions allowed by your constraints; inspect changes to the lock file and the resulting plan.

An apply is not a database transaction: some resources may change before another action fails. Inspect the error and run a fresh plan after correcting the cause. Reverting a Git commit also needs a new plan; it does not automatically restore deleted data.

[Back to contents](#contents)

## 14. Troubleshooting

| Symptom | What to check |
| --- | --- |
| `terraform: command not found` | Installation and the shell's `PATH`. |
| Provider download fails during `init` | Network access, proxy settings, provider source, and version constraints. |
| Unsupported argument | The resource documentation for the selected provider version; also check which block contains it. |
| No configuration files found | The working directory; run commands in the intended root module. |
| AWS access denied | Active account/profile and permissions for the failed operation. |
| State lock already held | Whether another run is active. Do not force-unlock a live operation. |
| Unexpected replacement | The changed argument or address and the provider's replacement requirements. |
| Bucket cannot be deleted | Remaining objects, versions, delete markers, or retention controls. |
| A variable change affects production | The selected root directory, backend state, inputs, and credentials. |
| No changes, but the application is unhealthy | Terraform checks managed infrastructure properties, not every application behavior. |

Before changing anything, identify **which root module, which state, and which account** the command is using.

## 15. Command Reference

| Command | Purpose |
| --- | --- |
| `terraform version` | Show the installed CLI version. |
| `terraform init` | Initialize providers, modules, and backend configuration. |
| `terraform fmt -recursive` | Format configuration, including subdirectories. |
| `terraform validate` | Check configuration consistency. |
| `terraform plan` | Preview proposed actions. |
| `terraform plan -out=reviewed.tfplan` | Save a proposed execution plan. |
| `terraform show reviewed.tfplan` | Read a saved plan. |
| `terraform apply reviewed.tfplan` | Execute the saved plan. |
| `terraform output` | Display root module outputs. |
| `terraform state list` | List resource addresses in the current state. |
| `terraform console` | Explore expressions interactively. |
| `terraform destroy` | Propose and, after confirmation, remove resources managed by this state. |

For command details and flags, use `terraform <command> -help` or the [CLI reference](https://developer.hashicorp.com/terraform/cli/commands).

## 16. Practice Projects and Questions

### Project 1: Local welcome files

Complete the local lab, change the input, add another named file with `for_each`, and clean up. Explain each planned action before applying it.

### Project 2: Application storage

Create the AWS practice bucket. Confirm its public-access, versioning, and encryption settings, then remove the disposable resources. Record the account, region, and state location you used.

### Project 3: Reusable environments

Build a small module and call it from separate development and staging roots. Give each root a separate state and inputs. Explain why changing development does not manage staging's objects.

### Questions to check your understanding

- What is the difference between a resource, a data source, and a provider?
- Why does Terraform need state if configuration already describes the resources?
- How is `.terraform.lock.hcl` different from a state lock?
- Why does `sensitive = true` not mean a secret is absent from state?
- When would `for_each` be easier to maintain than `count`?
- What should you inspect before approving a replacement?
- Why is applying a saved plan different from running `terraform apply` alone?
- What happens if an apply succeeds for two resources and fails on the third?

You understand the workflow when you can explain the proposed plan, identify its state and target environment, and verify the outcome after applying it.

[Back to contents](#contents)
