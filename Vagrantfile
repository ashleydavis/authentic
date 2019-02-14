# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  
  config.vm.box = "ubuntu/xenial64"

  config.vm.network "forwarded_port", guest: 5000, host: 5000     # Webpack dev server.
  config.vm.network "forwarded_port", guest: 5001, host: 5002     # Main web service / API
  config.vm.network "forwarded_port", guest: 27017, host: 5001    # MongoDB
  
  config.vm.provision "shell", path: "./scripts/provision-dev-vm.sh"
  
end
