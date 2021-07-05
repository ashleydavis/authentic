#
# Terraform file to deploy Authentic to Kubernetes.
#
# Please see the file variables.tf to see what variables you must provide allow this to work.
#

resource "kubernetes_deployment" "authentic_deployment" {
  metadata {
    name = "authentic"

    labels = {
      pod = "authentic"
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        pod = "authentic"
      }
    }

    template {
      metadata {
        labels = {
          pod = "authentic"
        }
      }

      spec {
        container {
          image = "codecapers/authentic:1.0.9"
          name  = "authentic"

          env {
            name = "PORT"
            value = "80"
          }

          env {
              name = "NODE_ENV"
              value = "production"
          }

          env {
              name = "DBHOST"
              value = var.dbhost
          }

          env {
              name = "DBNAME"
              value = "auth"
          }

          env {
              name = "JWT_SECRET"
              value = var.jwt_secret
          }

          env {
              name = "JWT_VERSION"
              value = "1"
          }
          
          env {
              name = "MAILER_HOST"
              value = "http://mailer"
          }

          env {
              name = "VERBOSE"
              value = "true"
          }

          env {
              name = "CONF_EMAIL_SUBJECT"
              value = "Please confirm your account"
          }

          env {
              name = "PW_RESET_TOKEN_TYPE"
              value = "random"
          }

          env {
              name = "CONF_EMAIL_TEMPLATE"
              value = <<EOT
Welcome to Authentic!

You are receiving this email because you have signed up for an account with Authentic.

To confirm your account, please click on the following link or paste the the link into your browser:

http://{{HOST}}/api/auth/confirm?token={{TOKEN}}&email={{EMAIL}}

If you did not request an account, please ignore this email and your account will not be created.
              EOT
          }

          env {
              name = "PWRESET_EMAIL_SUBJECT"
              value = "Reset your password"
          }

          env {
              name = "PWRESET_EMAIL_TEMPLATE"
              value = <<EOT
You are receiving this email because you have requested a password reset for Authentic.

To complete the process, , please click on the following link or paste the the link into your browser:

http://{{HOST}}/api/auth/reset-password?token={{TOKEN}}&email={{EMAIL}}

If you did not request this, please ignore this email and your password will remain unchanged.
              EOT
          }

        }
      }
    }
  }
}

resource "kubernetes_service" "authentic_service" {
    metadata {
        name = "authentic"
    }

    spec {
        selector = {
            pod = kubernetes_deployment.authentic_deployment.metadata[0].labels.pod
        }   

        port {
            port        = 80
            target_port = 80
        }
    }
}
