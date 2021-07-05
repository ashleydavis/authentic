# Sets global variables for this Terraform project.

variable do_token {
    description = "The Digital Ocean API token configure the connection to the Kubernetes cluster."
}

variable cluster_name {
    description = "The name of the Kubernetes cluster to which you are deploying."
}

variable dbhost {
    description = "The connection string for the MongoDB database."
}

variable jwt_secret {
    description = "The secret value to use when generating JWTs."
}
