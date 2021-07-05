#
# Initialises Terraform providers and sets their version numbers.
#

terraform {
    required_providers {
        digitalocean = {
            source = "digitalocean/digitalocean"
            version = "2.3.0"
        }
    }
}

provider "digitalocean" {
    #version = "2.1.0"
    token = var.do_token
}

data "digitalocean_kubernetes_cluster" "onroute_cluster" {
    name = var.cluster_name
}

provider "kubernetes" {
    version = "1.13.3"
    load_config_file = false
    host  = data.digitalocean_kubernetes_cluster.onroute_cluster.endpoint
    token = data.digitalocean_kubernetes_cluster.onroute_cluster.kube_config[0].token
    cluster_ca_certificate = base64decode(data.digitalocean_kubernetes_cluster.onroute_cluster.kube_config[0].cluster_ca_certificate)
}
