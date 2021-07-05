# Authentic deployment examples

This directory contains examples of deploying Authentic to Kubernetes.

- `kubectl-yaml`    - Contains a Kubernetes yaml file for deploying Authentic using Kubectl.
- `terraform`       - Contains Terraform code for deploying Authentic.

Please see the README.MD in each subdirectory for further instructions.

NOTE: Neither of these deployment configuration is complete, these examples will deploy Authentic, but it won't work unless you also deploy a Mailer microservice that Authentic can use to send emails. You can see an example of what this looks like in the `mock-mailer` subdirectory of this code repository. 