# Authentic deployment with Kubectl + Yaml

This directory contains a yaml file to deploy Authentic to your Kubernetes cluster.


## Pre requisites

You need Kubectl installed and authenticated against your Kubernetes cluster.

## To deploy

Open a terminal and change directory to the `kubectl-yaml` subdirectory:

```bash
cd authentic/deployment-samples/kubectl-yaml
```

Now use Kubectl to deploy:

```bash
kubectl create -f authentic.yaml
```

If you want to delete it later:

```bash
kubectl delete -f authentic.yaml
```