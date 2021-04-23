# Authentic deployment with Terraform

This directory contains example Terraform code to deploy Authentic to a production Kubernetes cluster.

This example is configured to use a Kubernetes cluster created on Digital Ocean.

## Pre requisites

You need Terraform installed to deploy.

You must have a Kubernetes cluster already running on Digital Ocean.

You must have your Digital Ocean API key (the DO token).

## To deploy

Open a terminal and change directory to directory with the Terraform code:

```bash
cd authentic/deployment-samples/terraform
```

Now run Terraform init to download provider plugins (you only have to do this the first time):

```bash
terraform init
```

Now run Terraform apply to run the Terraform code and do the deployment:

```bash
terraform apply
```

You have to provide various details before deployment, including your Digital Ocean API key, the other details required will be explained in your terminal when you run `terraform apply`.

When it asks "Do you want to perform these actions?", type "Yes" and the deployment will commence.

Give it a few minutes to finish, then you should be able to check in your Kubernetes cluster to see that the deployment of Authentic was sucessful.

If you want to delete it later:

```bash
terraform destroy
```