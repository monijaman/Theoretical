# basic

**Source:** basic.pdf

---

## Content

AWS Basic Interview Questions
Q1. What is AWS? Ans. AWS is a cloud computing service offered by Amazon. AWS lets you build, test, deploy and manage applications and services. All this is done via the data-centers and the hardware managed by Amazon. AWS provides you a combination of Infrastructure-as-a-Service (IaaS), Platform-as-a-Service (PaaS), and Software-as-a-Service (SaaS) offerings.
You can use AWS to create Virtual Machines which can be armed with processing power, storage capacity, and analytics along with networking and device management. AWS offers you a pay-as-you-go model, which helps to avoid upfront costs and pay based on the usage monthly.
Q2. Compare between AWS and OpenStack. Ans. Basic difference between AWS and OpenStack is following:-
Q3. What is EC2?
Ans. EC2, a Virtual Machine in the cloud on which you have OS-level control. You can run this cloud server whenever you want and can be used when you need to deploy your own servers in the cloud, similar to your on-premises servers, and when you want to have full control over the choice of hardware and the updates on the machine.
Q4. What is SnowBall?
Ans. SnowBall is a small application that enables you to transfer terabytes of data inside and outside of the AWS environment.
Q5. How are Spot Instance and On-demand Instance different from one another?

Ans. Both Spot Instance and On-demand Instance are models for pricing
Q6. Define and explain the three basic types of cloud services and the AWS products that are built based on them?
Ans. The three basic types of cloud services are: Computing Storage Networking
Here are some of the AWS products that are built based on the three cloud service types: Computing - These include EC2, Elastic Beanstalk, Lambda, Auto-Scaling, and Lightsat. Storage - These include S3, Glacier, Elastic Block Storage, Elastic File System. Networking - These include VPC, Amazon CloudFront, Route53 Q7. What is CloudWatch? Ans. CloudWatch helps you to monitor AWS environments like EC2, RDS Instances, and CPU utilization. It also triggers alarms depending on various metrics.

Q8. What is auto-scaling?
Ans. Auto-scaling a function that allows you to provision and launch new instances whenever there is a demand. It allows you to automatically increase or decrease resource capacity in relation to the demand.
Q9. How do you upgrade or downgrade a system with nearzero downtime?
Ans. You can upgrade or downgrade a system with near-zero downtime using the following steps of migration:
Open EC2 console Choose Operating System AMI Launch an instance with the new instance type Install all the updates Install applications Test the instance to see if it's working If working, deploy the new instance and replace the older instance Once it's deployed, you can upgrade or downgrade the system with nearzero downtime.
Q10. What are the native AWS Security logging capabilities?
Most of the AWS services have their logging options. Also, some of them have an account level logging, like in AWS CloudTrail, AWS Config, and others. Let's take a look at two services in specific:
AWS CloudTrail This is a service that provides a history of the AWS API calls for every account. It lets you perform security analysis, resource change tracking, and compliance auditing of your AWS environment as well. The best part about this service is

that it enables you to configure it to send notifications via AWS SNS when new logs are delivered.
AWS Config
This helps you understand the configuration changes that happen in your environment. This service provides an AWS inventory that includes configuration history, configuration change notification, and relationships between AWS resources. It can also be configured to send information via AWS SNS when new logs are delivered.
Q11. What are the different types of virtualization in AWS, and what are the differences between them?
Ans. The three major types of virtualization in AWS are:
Hardware Virtual Machine (HVM)
It is a fully virtualized hardware, where all the virtual machines act separate from each other. These virtual machines boot by executing a master boot record in the root block device of your image. Paravirtualization (PV) Paravirtualization-GRUB is the bootloader that boots the PV AMIs. The PVGRUB chain loads the kernel specified in the menu. Paravirtualization on HVM PV on HVM helps operating systems take advantage of storage and network I/O available through the host.
Q12. What are the differences between NAT Gateways and NAT Instances?
Ans. While both NAT Gateways and NAT Instances serve the same function, they still have some key differences.

Q13. What is the difference between stopping and terminating an EC2 instance?
While you may think that both stopping and terminating are the same, there is a difference. When you stop an EC2 instance, it performs a normal shutdown on the instance and moves to a stopped state. However, when you terminate the instance, it is transferred to a stopped state, and the EBS volumes attached to it are deleted and can never be recovered.
Q14. What are the different types of EC2 instances based on their costs?
Ans. The three types of EC2 instances are:
On-demand Instance
It is cheap for a short time but not when taken for the long term Spot Instance
It is less expensive than the on-demand instance and can be bought through bidding. Reserved Instance
If you are planning to use an instance for a year or more, then this is the right one for you.
Q15. How do you set up SSH agent forwarding so that you do not have to copy the key every time you log in?

Ans. Here's how you accomplish this:
1.Go to your PuTTY Configuration 2.Go to the category SSH -> Auth 3.Enable SSH agent forwarding to your instance
Q16. How do you configure CloudWatch to recover an EC2 instance?
Ans. Here's how you can configure them:
Create an Alarm using Amazon CloudWatch In the Alarm, go to Define Alarm -> Actions tab Choose Recover this instance option
Q17. How can you recover/login to an EC2 instance for which you have lost the key?
Ans. Follow the steps provided below to recover an EC2 instance if you have lost the key:
1.Verify that the EC2Config service is running 2.Detach the root volume for the instance 3.Attach the volume to a temporary instance 4.Modify the configuration file 5.Restart the original instance
Q18. What are the factors to consider while migrating to Amazon Web Services?
Ans. Here are the factors to consider during AWS migration:

Operational Costs - These include the cost of infrastructure, ability to match demand and supply, transparency, and others.
Workforce Productivity
Cost avoidance
Operational resilience
Business agility
Q19. What is the importance of buffer in Amazon Web Services?
Ans. An Elastic Load Balancer ensures that the incoming traffic is distributed optimally across various AWS instances. A buffer will synchronize different components and makes the arrangement additionally elastic to a burst of load or traffic. The components are prone to work in an unstable way of receiving and processing requests. The buffer creates an equilibrium linking various apparatus and crafts them work at an identical rate to supply more rapid services.
Q20. Is there a way to upload a file that is greater than 100 megabytes in Amazon S3?
Yes, it is possible by using multipart upload utility from AWS. With multipart upload utility, larger files can be uploaded in multiple parts that are uploaded independently. You can also decrease upload time by uploading these parts in parallel. After the upload is done, the parts will be merged into a single object or file to create the original file from which the parts were created.
Q21. What is the maximum number of S3 buckets you can create?
Ans. 100

Q22. When should you use the classic load balancer and the application load balancer?
Ans. The classic load balancer is used for simple load balancing of traffic across multiple EC2 instances. While, the application load balancing is used for more intelligent load balancing, based on the multi-tier architecture or container-based architecture of the application. Application load balancing is mostly used when there is a need to route traffic to multiple services.
Q23. How many total VPCs per account/region and subnets per VPC can you have?
Ans. 5, 200
Q24. Your organization has decided to have all their workload on the public cloud. But, due to certain security concerns, your organization decides to distribute some of the workload on private servers. You are asked to suggest a cloud architecture for your organization. What will be your suggestion?
Ans. A hybrid cloud. The hybrid cloud architecture is where an organization can use the public cloud for shared resources and the private cloud for its confidential workloads.
Q25. You have connected four instances to ELB. To automatically terminate your unhealthy instances and replace them with new ones, which functionality would you use?
Ans. Auto-scaling groups
Q26. Which of the following is a global Content Delivery Network service that securely delivers data to users with low latency and high transfer speed.
Amazon CloudFront

Q27. Which Amazon solution will you use if you want to accelerate moving petabytes of data in and out of AWS, using storage devices that are designed to be secure for data transfer?
Ans. Amazon Snowball. AWS Snowball is the data transport solution for large amounts of data that need to be moved into and out of AWS using physical storage devices.
Q28. If you are running your DB instance as Multi-AZ deployment, can you use standby DB instances along with your primary DB instance?
Ans. No, the standby DB instance cannot be used along with the primary DB instances since the standby DB instances are supposed to be used only if the primary instance goes down.
Q29. Your organization is developing a new multi-tier web application in AWS. Being a fairly new and small organization, there's limited staff. But, the organization requires high availability. This new application comprises complex queries and table joins. Which Amazon service will be the best solution for your organization's requirements?
Ans. DynamoDB will be the right choice here since it is designed to be highly scalable, more than RDS or any other relational database services.
Q30. You accidently stopped an EC2 instance in a VPC with an associated Elastic IP. If you start the instance again, what will be the result?
Ans. Elastic IP will be only disassociated from the instance if it's terminated. If it's stopped and started, there won't be any change to instance and no data will be lost.

Q31. Your organization has around 50 IAM users. Now, it wants to introduce a new policy that will affect the access permissions of an IAM user. How can it implement this without having to apply the policy at the individual user level?
Ans. It is possible using IAM groups, by adding users in the groups as per their roles and by simply applying the policy to the groups.
Q32. You have an application running on your Amazon EC2 instance. You want to reduce the load on your instance as soon as the CPU utilization reaches 100 percent. How will you do that?
Ans. It can be done by creating an autoscaling group to deploy more instances when the CPU utilization exceeds 100 percent and distributing traffic among instances by creating a load balancer and registering the Amazon EC2 instances with it.



---

*Parsed from PDF on 2026-03-13T10:18:55.985Z*
