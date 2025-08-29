Pages
Projects
pages.projects

Methods


Create Project -> Envelope<Project>
post
/accounts/{account_id}/pages/projects
Create a new project.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

Body parameters

build_config: { Optional
Configs for the project build process.

build_caching: booleanOptional
Enable build caching for the project.

build_command: stringOptional
Command used to build project.

destination_dir: stringOptional
Output directory of the build.

root_dir: stringOptional
Directory to run the command.

web_analytics_tag: stringOptional
The classifying tag for analytics.

web_analytics_token: stringOptional
The auth token for analytics.

}

deployment_configs: { Optional
Configs for deployments in a project.


preview: { ai_bindings, analytics_engine_datasets, browsers, 13 more... }Optional
Configs for preview deploys.


production: { ai_bindings, analytics_engine_datasets, browsers, 13 more... }Optional
Configs for production deploys.

}
name: stringOptional
Name of the project.

production_branch: stringOptional
Production branch of the project. Used to identify production deployments.


source: { Optional

config: { Optional
deployments_enabled: booleanOptional
owner: stringOptional
path_excludes: Array<string>Optional
path_includes: Array<string>Optional
pr_comments_enabled: booleanOptional
preview_branch_excludes: Array<string>Optional
preview_branch_includes: Array<string>Optional

preview_deployment_setting: "all" | "none" | "custom"Optional
production_branch: stringOptional
production_deployments_enabled: booleanOptional
repo_name: stringOptional
}
type: stringOptional
}
Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>
result: Project

success:
Whether the API call was successful

false
true
cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects \
    -H 'Content-Type: application/json' \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
    -d '{
          "name": "NextJS Blog",
          "production_branch": "main"
        }'
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": {
    "build_config": {
      "build_caching": true,
      "build_command": "npm run build",
      "destination_dir": "build",
      "root_dir": "/",
      "web_analytics_tag": "cee1c73f6e4743d0b5e6bb1a0bcaabcc",
      "web_analytics_token": "021e1057c18547eca7b79f2516f06o7x"
    },
    "deployment_configs": {
      "preview": {
        "ai_bindings": {
          "AI_BINDING": {
            "project_id": "some-project-id"
          }
        },
        "analytics_engine_datasets": {
          "ANALYTICS_ENGINE_BINDING": {
            "dataset": "api_analytics"
          }
        },
        "browsers": {
          "BROWSER": {}
        },
        "compatibility_date": "2022-01-01",
        "compatibility_flags": [
          "url_standard"
        ],
        "d1_databases": {
          "D1_BINDING": {
            "id": "445e2955-951a-43f8-a35b-a4d0c8138f63"
          }
        },
        "durable_object_namespaces": {
          "DO_BINDING": {
            "namespace_id": "5eb63bbbe01eeed093cb22bb8f5acdc3"
          }
        },
        "env_vars": {
          "foo": {
            "type": "plain_text",
            "value": "hello world"
          }
        },
        "hyperdrive_bindings": {
          "HYPERDRIVE": {
            "id": "a76a99bc342644deb02c38d66082262a"
          }
        },
        "kv_namespaces": {
          "KV_BINDING": {
            "namespace_id": "5eb63bbbe01eeed093cb22bb8f5acdc3"
          }
        },
        "mtls_certificates": {
          "MTLS": {
            "certificate_id": "d7cdd17c-916f-4cb7-aabe-585eb382ec4e"
          }
        },
        "placement": {
          "mode": "smart"
        },
        "queue_producers": {
          "QUEUE_PRODUCER_BINDING": {
            "name": "some-queue"
          }
        },
        "r2_buckets": {
          "R2_BINDING": {
            "jurisdiction": "eu",
            "name": "some-bucket"
          }
        },
        "services": {
          "SERVICE_BINDING": {
            "entrypoint": "MyHandler",
            "environment": "production",
            "service": "example-worker"
          }
        },
        "vectorize_bindings": {
          "VECTORIZE": {
            "index_name": "my_index"
          }
        }
      },
      "production": {
        "ai_bindings": {
          "AI_BINDING": {
            "project_id": "some-project-id"
          }
        },
        "analytics_engine_datasets": {
          "ANALYTICS_ENGINE_BINDING": {
            "dataset": "api_analytics"
          }
        },
        "browsers": {
          "BROWSER": {}
        },
        "compatibility_date": "2022-01-01",
        "compatibility_flags": [
          "url_standard"
        ],
        "d1_databases": {
          "D1_BINDING": {
            "id": "445e2955-951a-43f8-a35b-a4d0c8138f63"
          }
        },
        "durable_object_namespaces": {
          "DO_BINDING": {
            "namespace_id": "5eb63bbbe01eeed093cb22bb8f5acdc3"
          }
        },
        "env_vars": {
          "foo": {
            "type": "plain_text",
            "value": "hello world"
          }
        },
        "hyperdrive_bindings": {
          "HYPERDRIVE": {
            "id": "a76a99bc342644deb02c38d66082262a"
          }
        },
        "kv_namespaces": {
          "KV_BINDING": {
            "namespace_id": "5eb63bbbe01eeed093cb22bb8f5acdc3"
          }
        },
        "mtls_certificates": {
          "MTLS": {
            "certificate_id": "d7cdd17c-916f-4cb7-aabe-585eb382ec4e"
          }
        },
        "placement": {
          "mode": "smart"
        },
        "queue_producers": {
          "QUEUE_PRODUCER_BINDING": {
            "name": "some-queue"
          }
        },
        "r2_buckets": {
          "R2_BINDING": {
            "jurisdiction": "eu",
            "name": "some-bucket"
          }
        },
        "services": {
          "SERVICE_BINDING": {
            "entrypoint": "MyHandler",
            "environment": "production",
            "service": "example-worker"
          }
        },
        "vectorize_bindings": {
          "VECTORIZE": {
            "index_name": "my_index"
          }
        }
      }
    },
    "name": "NextJS Blog",
    "production_branch": "main",
    "source": {
      "config": {
        "deployments_enabled": true,
        "owner": "owner",
        "path_excludes": [
          "string"
        ],
        "path_includes": [
          "string"
        ],
        "pr_comments_enabled": true,
        "preview_branch_excludes": [
          "string"
        ],
        "preview_branch_includes": [
          "string"
        ],
        "preview_deployment_setting": "all",
        "production_branch": "production_branch",
        "production_deployments_enabled": true,
        "repo_name": "repo_name"
      },
      "type": "type"
    }
  },
  "success": true
}

Delete Project -> Envelope<unknown>
delete
/accounts/{account_id}/pages/projects/{project_name}
Delete a project by name.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>
result: unknown

success: false | true
Whether the API call was successful

cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME \
    -X DELETE \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY"
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": {},
  "success": true
}

Update Project -> Envelope<Project>
patch
/accounts/{account_id}/pages/projects/{project_name}
Set new attributes for an existing project. Modify environment variables. To delete an environment variable, set the key to null.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

Body parameters

build_config: { build_caching, build_command, destination_dir, 3 more... }Optional
Configs for the project build process.


deployment_configs: { preview, production }Optional
Configs for deployments in a project.

name: stringOptional
Name of the project.

production_branch: stringOptional
Production branch of the project. Used to identify production deployments.


source: { config, type }Optional
Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>
result: Project

success: false | true
Whether the API call was successful

cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME \
    -X PATCH \
    -H 'Content-Type: application/json' \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
    -d '{
          "name": "NextJS Blog",
          "production_branch": "main"
        }'
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": {
    "build_config": {
      "build_caching": true,
      "build_command": "npm run build",
      "destination_dir": "build",
      "root_dir": "/",
      "web_analytics_tag": "cee1c73f6e4743d0b5e6bb1a0bcaabcc",
      "web_analytics_token": "021e1057c18547eca7b79f2516f06o7x"
    },
    "deployment_configs": {
      "preview": {
        "ai_bindings": {
          "AI_BINDING": {
            "project_id": "some-project-id"
          }
        },
        "analytics_engine_datasets": {
          "ANALYTICS_ENGINE_BINDING": {
            "dataset": "api_analytics"
          }
        },
        "browsers": {
          "BROWSER": {}
        },
        "compatibility_date": "2022-01-01",
        "compatibility_flags": [
          "url_standard"
        ],
        "d1_databases": {
          "D1_BINDING": {
            "id": "445e2955-951a-43f8-a35b-a4d0c8138f63"
          }
        },
        "durable_object_namespaces": {
          "DO_BINDING": {
            "namespace_id": "5eb63bbbe01eeed093cb22bb8f5acdc3"
          }
        },
        "env_vars": {
          "foo": {
            "type": "plain_text",
            "value": "hello world"
          }
        },
        "hyperdrive_bindings": {
          "HYPERDRIVE": {
            "id": "a76a99bc342644deb02c38d66082262a"
          }
        },
        "kv_namespaces": {
          "KV_BINDING": {
            "namespace_id": "5eb63bbbe01eeed093cb22bb8f5acdc3"
          }
        },
        "mtls_certificates": {
          "MTLS": {
            "certificate_id": "d7cdd17c-916f-4cb7-aabe-585eb382ec4e"
          }
        },
        "placement": {
          "mode": "smart"
        },
        "queue_producers": {
          "QUEUE_PRODUCER_BINDING": {
            "name": "some-queue"
          }
        },
        "r2_buckets": {
          "R2_BINDING": {
            "jurisdiction": "eu",
            "name": "some-bucket"
          }
        },
        "services": {
          "SERVICE_BINDING": {
            "entrypoint": "MyHandler",
            "environment": "production",
            "service": "example-worker"
          }
        },
        "vectorize_bindings": {
          "VECTORIZE": {
            "index_name": "my_index"
          }
        }
      },
      "production": {
        "ai_bindings": {
          "AI_BINDING": {
            "project_id": "some-project-id"
          }
        },
        "analytics_engine_datasets": {
          "ANALYTICS_ENGINE_BINDING": {
            "dataset": "api_analytics"
          }
        },
        "browsers": {
          "BROWSER": {}
        },
        "compatibility_date": "2022-01-01",
        "compatibility_flags": [
          "url_standard"
        ],
        "d1_databases": {
          "D1_BINDING": {
            "id": "445e2955-951a-43f8-a35b-a4d0c8138f63"
          }
        },
        "durable_object_namespaces": {
          "DO_BINDING": {
            "namespace_id": "5eb63bbbe01eeed093cb22bb8f5acdc3"
          }
        },
        "env_vars": {
          "foo": {
            "type": "plain_text",
            "value": "hello world"
          }
        },
        "hyperdrive_bindings": {
          "HYPERDRIVE": {
            "id": "a76a99bc342644deb02c38d66082262a"
          }
        },
        "kv_namespaces": {
          "KV_BINDING": {
            "namespace_id": "5eb63bbbe01eeed093cb22bb8f5acdc3"
          }
        },
        "mtls_certificates": {
          "MTLS": {
            "certificate_id": "d7cdd17c-916f-4cb7-aabe-585eb382ec4e"
          }
        },
        "placement": {
          "mode": "smart"
        },
        "queue_producers": {
          "QUEUE_PRODUCER_BINDING": {
            "name": "some-queue"
          }
        },
        "r2_buckets": {
          "R2_BINDING": {
            "jurisdiction": "eu",
            "name": "some-bucket"
          }
        },
        "services": {
          "SERVICE_BINDING": {
            "entrypoint": "MyHandler",
            "environment": "production",
            "service": "example-worker"
          }
        },
        "vectorize_bindings": {
          "VECTORIZE": {
            "index_name": "my_index"
          }
        }
      }
    },
    "name": "NextJS Blog",
    "production_branch": "main",
    "source": {
      "config": {
        "deployments_enabled": true,
        "owner": "owner",
        "path_excludes": [
          "string"
        ],
        "path_includes": [
          "string"
        ],
        "pr_comments_enabled": true,
        "preview_branch_excludes": [
          "string"
        ],
        "preview_branch_includes": [
          "string"
        ],
        "preview_deployment_setting": "all",
        "production_branch": "production_branch",
        "production_deployments_enabled": true,
        "repo_name": "repo_name"
      },
      "type": "type"
    }
  },
  "success": true
}

Get Project -> Envelope<Project>
get
/accounts/{account_id}/pages/projects/{project_name}
Fetch a project by name.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Read Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>
result: Project

success: false | true
Whether the API call was successful

cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY"
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": {
    "build_config": {
      "build_caching": true,
      "build_command": "npm run build",
      "destination_dir": "build",
      "root_dir": "/",
      "web_analytics_tag": "cee1c73f6e4743d0b5e6bb1a0bcaabcc",
      "web_analytics_token": "021e1057c18547eca7b79f2516f06o7x"
    },
    "deployment_configs": {
      "preview": {
        "ai_bindings": {
          "AI_BINDING": {
            "project_id": "some-project-id"
          }
        },
        "analytics_engine_datasets": {
          "ANALYTICS_ENGINE_BINDING": {
            "dataset": "api_analytics"
          }
        },
        "browsers": {
          "BROWSER": {}
        },
        "compatibility_date": "2022-01-01",
        "compatibility_flags": [
          "url_standard"
        ],
        "d1_databases": {
          "D1_BINDING": {
            "id": "445e2955-951a-43f8-a35b-a4d0c8138f63"
          }
        },
        "durable_object_namespaces": {
          "DO_BINDING": {
            "namespace_id": "5eb63bbbe01eeed093cb22bb8f5acdc3"
          }
        },
        "env_vars": {
          "foo": {
            "type": "plain_text",
            "value": "hello world"
          }
        },
        "hyperdrive_bindings": {
          "HYPERDRIVE": {
            "id": "a76a99bc342644deb02c38d66082262a"
          }
        },
        "kv_namespaces": {
          "KV_BINDING": {
            "namespace_id": "5eb63bbbe01eeed093cb22bb8f5acdc3"
          }
        },
        "mtls_certificates": {
          "MTLS": {
            "certificate_id": "d7cdd17c-916f-4cb7-aabe-585eb382ec4e"
          }
        },
        "placement": {
          "mode": "smart"
        },
        "queue_producers": {
          "QUEUE_PRODUCER_BINDING": {
            "name": "some-queue"
          }
        },
        "r2_buckets": {
          "R2_BINDING": {
            "jurisdiction": "eu",
            "name": "some-bucket"
          }
        },
        "services": {
          "SERVICE_BINDING": {
            "entrypoint": "MyHandler",
            "environment": "production",
            "service": "example-worker"
          }
        },
        "vectorize_bindings": {
          "VECTORIZE": {
            "index_name": "my_index"
          }
        }
      },
      "production": {
        "ai_bindings": {
          "AI_BINDING": {
            "project_id": "some-project-id"
          }
        },
        "analytics_engine_datasets": {
          "ANALYTICS_ENGINE_BINDING": {
            "dataset": "api_analytics"
          }
        },
        "browsers": {
          "BROWSER": {}
        },
        "compatibility_date": "2022-01-01",
        "compatibility_flags": [
          "url_standard"
        ],
        "d1_databases": {
          "D1_BINDING": {
            "id": "445e2955-951a-43f8-a35b-a4d0c8138f63"
          }
        },
        "durable_object_namespaces": {
          "DO_BINDING": {
            "namespace_id": "5eb63bbbe01eeed093cb22bb8f5acdc3"
          }
        },
        "env_vars": {
          "foo": {
            "type": "plain_text",
            "value": "hello world"
          }
        },
        "hyperdrive_bindings": {
          "HYPERDRIVE": {
            "id": "a76a99bc342644deb02c38d66082262a"
          }
        },
        "kv_namespaces": {
          "KV_BINDING": {
            "namespace_id": "5eb63bbbe01eeed093cb22bb8f5acdc3"
          }
        },
        "mtls_certificates": {
          "MTLS": {
            "certificate_id": "d7cdd17c-916f-4cb7-aabe-585eb382ec4e"
          }
        },
        "placement": {
          "mode": "smart"
        },
        "queue_producers": {
          "QUEUE_PRODUCER_BINDING": {
            "name": "some-queue"
          }
        },
        "r2_buckets": {
          "R2_BINDING": {
            "jurisdiction": "eu",
            "name": "some-bucket"
          }
        },
        "services": {
          "SERVICE_BINDING": {
            "entrypoint": "MyHandler",
            "environment": "production",
            "service": "example-worker"
          }
        },
        "vectorize_bindings": {
          "VECTORIZE": {
            "index_name": "my_index"
          }
        }
      }
    },
    "name": "NextJS Blog",
    "production_branch": "main",
    "source": {
      "config": {
        "deployments_enabled": true,
        "owner": "owner",
        "path_excludes": [
          "string"
        ],
        "path_includes": [
          "string"
        ],
        "pr_comments_enabled": true,
        "preview_branch_excludes": [
          "string"
        ],
        "preview_branch_includes": [
          "string"
        ],
        "preview_deployment_setting": "all",
        "production_branch": "production_branch",
        "production_deployments_enabled": true,
        "repo_name": "repo_name"
      },
      "type": "type"
    }
  },
  "success": true
}

Get Projects -> SinglePage<Deployment>
get
/accounts/{account_id}/pages/projects
Fetch a list of all user projects.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Read Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>
result: Array<Deployment>

success: false | true
Whether the API call was successful


result_info: { count, page, per_page, 2 more... }Optional
cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY"
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": [
    {
      "build_config": {
        "build_caching": true,
        "build_command": "npm run build",
        "destination_dir": "build",
        "root_dir": "/",
        "web_analytics_tag": "cee1c73f6e4743d0b5e6bb1a0bcaabcc",
        "web_analytics_token": "021e1057c18547eca7b79f2516f06o7x"
      },
      "env_vars": {
        "foo": {
          "type": "plain_text",
          "value": "hello world"
        }
      },
      "source": {
        "config": {
          "deployments_enabled": true,
          "owner": "owner",
          "path_excludes": [
            "string"
          ],
          "path_includes": [
            "string"
          ],
          "pr_comments_enabled": true,
          "preview_branch_excludes": [
            "string"
          ],
          "preview_branch_includes": [
            "string"
          ],
          "preview_deployment_setting": "all",
          "production_branch": "production_branch",
          "production_deployments_enabled": true,
          "repo_name": "repo_name"
        },
        "type": "type"
      }
    }
  ],
  "success": true,
  "result_info": {
    "count": 1,
    "page": 1,
    "per_page": 100,
    "total_count": 1,
    "total_pages": 1
  }
}

Purge Build Cache -> Envelope<unknown>
post
/accounts/{account_id}/pages/projects/{project_name}/purge_build_cache
Purge all cached build artifacts for a Pages project

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>
result: unknown

success: false | true
Whether the API call was successful

cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/purge_build_cache \
    -X POST \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY"
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": {},
  "success": true
}
Domain types


Deployment = {
id: stringOptional
Id of the deployment.

aliases: Array<string>Optional
A list of alias URLs pointing to this deployment.


build_config: { Optional
Configs for the project build process.

build_caching: booleanOptional
Enable build caching for the project.

build_command: stringOptional
Command used to build project.

destination_dir: stringOptional
Output directory of the build.

root_dir: stringOptional
Directory to run the command.

web_analytics_tag: stringOptional
The classifying tag for analytics.

web_analytics_token: stringOptional
The auth token for analytics.

}
created_on: stringOptional
(format: date-time)
When the deployment was created.


deployment_trigger: { Optional
Info about what caused the deployment.


metadata: { branch, commit_hash, commit_message }Optional
Additional info about the trigger.


type: "push" | "ad_hoc"Optional
What caused the deployment.

}

env_vars: Record<string, Optional
Environment variables used for builds and Pages Functions.


PlainText = { type, value }
A plaintext environment variable.


SecretText = { type, value }
An encrypted environment variable.

>

environment: Optional
Type of deploy.

"preview"
"production"
is_skipped: booleanOptional
If the deployment has been skipped.

latest_stage: StageOptional
The status of the deployment.

modified_on: stringOptional
(format: date-time)
When the deployment was last modified.

project_id: stringOptional
Id of the project.

project_name: stringOptional
Name of the project.

short_id: stringOptional
Short Id (8 character) of the deployment.


source: { Optional

config: { deployments_enabled, owner, path_excludes, 8 more... }Optional
type: stringOptional
}
stages: Array<Stage>Optional
List of past stages.

url: stringOptional
The live URL to view this deployment.

}

Project = {
id: stringOptional
Id of the project.


build_config: { build_caching, build_command, destination_dir, 3 more... }Optional
Configs for the project build process.

canonical_deployment: DeploymentOptional
Most recent deployment to the repo.

created_on: stringOptional
(format: date-time)
When the project was created.


deployment_configs: { preview, production }Optional
Configs for deployments in a project.

domains: Array<string>Optional
A list of associated custom domains for the project.

latest_deployment: DeploymentOptional
Most recent deployment to the repo.

name: stringOptional
Name of the project.

production_branch: stringOptional
Production branch of the project. Used to identify production deployments.


source: { config, type }Optional
subdomain: stringOptional
The Cloudflare subdomain associated with the project.

}

Stage = {
The status of the deployment.

ended_on: stringOptional
(format: date-time)
When the stage ended.


name: "queued" | "initialize" | "clone_repo" | 2 more...Optional
The current build stage.

started_on: stringOptional
(format: date-time)
When the stage started.


status: "success" | "idle" | "active" | 2 more...Optional
State of the current stage.

}
Pages
Projects
Deployments
pages.projects.deployments

Methods


Create Deployment -> Envelope<Deployment>
post
/accounts/{account_id}/pages/projects/{project_name}/deployments
Start a new deployment from production. The repository and account must have already been authorized on the Cloudflare Pages dashboard.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

Body parameters
branch: stringOptional
The branch to build the new deployment from. The HEAD of the branch will be used. If omitted, the production branch will be used by default.

Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>
result: Deployment

success: false | true
Whether the API call was successful

cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments \
    -H 'Content-Type: multipart/form-data' \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
    -F branch=staging
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": {
    "build_config": {
      "build_caching": true,
      "build_command": "npm run build",
      "destination_dir": "build",
      "root_dir": "/",
      "web_analytics_tag": "cee1c73f6e4743d0b5e6bb1a0bcaabcc",
      "web_analytics_token": "021e1057c18547eca7b79f2516f06o7x"
    },
    "env_vars": {
      "foo": {
        "type": "plain_text",
        "value": "hello world"
      }
    },
    "source": {
      "config": {
        "deployments_enabled": true,
        "owner": "owner",
        "path_excludes": [
          "string"
        ],
        "path_includes": [
          "string"
        ],
        "pr_comments_enabled": true,
        "preview_branch_excludes": [
          "string"
        ],
        "preview_branch_includes": [
          "string"
        ],
        "preview_deployment_setting": "all",
        "production_branch": "production_branch",
        "production_deployments_enabled": true,
        "repo_name": "repo_name"
      },
      "type": "type"
    }
  },
  "success": true
}

Delete Deployment -> Envelope<unknown>
delete
/accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}
Delete a deployment.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

deployment_id: string
(maxLength: 32)
Identifier

Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>
result: unknown

success: false | true
Whether the API call was successful

cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments/$DEPLOYMENT_ID \
    -X DELETE \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY"
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": {},
  "success": true
}

Get Deployment Info -> Envelope<Deployment>
get
/accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}
Fetch information about a deployment.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Read Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

deployment_id: string
(maxLength: 32)
Identifier

Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>
result: Deployment

success: false | true
Whether the API call was successful

cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments/$DEPLOYMENT_ID \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY"
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": {
    "build_config": {
      "build_caching": true,
      "build_command": "npm run build",
      "destination_dir": "build",
      "root_dir": "/",
      "web_analytics_tag": "cee1c73f6e4743d0b5e6bb1a0bcaabcc",
      "web_analytics_token": "021e1057c18547eca7b79f2516f06o7x"
    },
    "env_vars": {
      "foo": {
        "type": "plain_text",
        "value": "hello world"
      }
    },
    "source": {
      "config": {
        "deployments_enabled": true,
        "owner": "owner",
        "path_excludes": [
          "string"
        ],
        "path_includes": [
          "string"
        ],
        "pr_comments_enabled": true,
        "preview_branch_excludes": [
          "string"
        ],
        "preview_branch_includes": [
          "string"
        ],
        "preview_deployment_setting": "all",
        "production_branch": "production_branch",
        "production_deployments_enabled": true,
        "repo_name": "repo_name"
      },
      "type": "type"
    }
  },
  "success": true
}

Get Deployments -> SinglePage<Deployment>
get
/accounts/{account_id}/pages/projects/{project_name}/deployments
Fetch a list of project deployments.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Read Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

query Parameters

env: Optional
What type of deployments to fetch.

"production"
"preview"
Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>
result: Array<Deployment>

success: false | true
Whether the API call was successful


result_info: { count, page, per_page, 2 more... }Optional
cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY"
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": [
    {
      "build_config": {
        "build_caching": true,
        "build_command": "npm run build",
        "destination_dir": "build",
        "root_dir": "/",
        "web_analytics_tag": "cee1c73f6e4743d0b5e6bb1a0bcaabcc",
        "web_analytics_token": "021e1057c18547eca7b79f2516f06o7x"
      },
      "env_vars": {
        "foo": {
          "type": "plain_text",
          "value": "hello world"
        }
      },
      "source": {
        "config": {
          "deployments_enabled": true,
          "owner": "owner",
          "path_excludes": [
            "string"
          ],
          "path_includes": [
            "string"
          ],
          "pr_comments_enabled": true,
          "preview_branch_excludes": [
            "string"
          ],
          "preview_branch_includes": [
            "string"
          ],
          "preview_deployment_setting": "all",
          "production_branch": "production_branch",
          "production_deployments_enabled": true,
          "repo_name": "repo_name"
        },
        "type": "type"
      }
    }
  ],
  "success": true,
  "result_info": {
    "count": 1,
    "page": 1,
    "per_page": 100,
    "total_count": 1,
    "total_pages": 1
  }
}

Retry Deployment -> Envelope<Deployment>
post
/accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}/retry
Retry a previous deployment.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

deployment_id: string
(maxLength: 32)
Identifier

Body parameters
body: unknown
Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>
result: Deployment

success: false | true
Whether the API call was successful

cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments/$DEPLOYMENT_ID/retry \
    -H 'Content-Type: application/json' \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
    -d '{}'
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": {
    "build_config": {
      "build_caching": true,
      "build_command": "npm run build",
      "destination_dir": "build",
      "root_dir": "/",
      "web_analytics_tag": "cee1c73f6e4743d0b5e6bb1a0bcaabcc",
      "web_analytics_token": "021e1057c18547eca7b79f2516f06o7x"
    },
    "env_vars": {
      "foo": {
        "type": "plain_text",
        "value": "hello world"
      }
    },
    "source": {
      "config": {
        "deployments_enabled": true,
        "owner": "owner",
        "path_excludes": [
          "string"
        ],
        "path_includes": [
          "string"
        ],
        "pr_comments_enabled": true,
        "preview_branch_excludes": [
          "string"
        ],
        "preview_branch_includes": [
          "string"
        ],
        "preview_deployment_setting": "all",
        "production_branch": "production_branch",
        "production_deployments_enabled": true,
        "repo_name": "repo_name"
      },
      "type": "type"
    }
  },
  "success": true
}

Rollback Deployment -> Envelope<Deployment>
post
/accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}/rollback
Rollback the production deployment to a previous deployment. You can only rollback to succesful builds on production.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

deployment_id: string
(maxLength: 32)
Identifier

Body parameters
body: unknown
Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>
result: Deployment

success: false | true
Whether the API call was successful

cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments/$DEPLOYMENT_ID/rollback \
    -H 'Content-Type: application/json' \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
    -d '{}'
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": {
    "build_config": {
      "build_caching": true,
      "build_command": "npm run build",
      "destination_dir": "build",
      "root_dir": "/",
      "web_analytics_tag": "cee1c73f6e4743d0b5e6bb1a0bcaabcc",
      "web_analytics_token": "021e1057c18547eca7b79f2516f06o7x"
    },
    "env_vars": {
      "foo": {
        "type": "plain_text",
        "value": "hello world"
      }
    },
    "source": {
      "config": {
        "deployments_enabled": true,
        "owner": "owner",
        "path_excludes": [
          "string"
        ],
        "path_includes": [
          "string"
        ],
        "pr_comments_enabled": true,
        "preview_branch_excludes": [
          "string"
        ],
        "preview_branch_includes": [
          "string"
        ],
        "preview_deployment_setting": "all",
        "production_branch": "production_branch",
        "production_deployments_enabled": true,
        "repo_name": "repo_name"
      },
      "type": "type"
    }
  },
  "success": true
}
Pages
Projects
Deployments
History
pages.projects.deployments.history

Pages
Projects
Deployments
History
Logs
pages.projects.deployments.history.logs

Methods


Get Deployment Logs -> Envelope<{ data, includes_container_logs, total }>
get
/accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}/history/logs
Fetch deployment logs for a project.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Read Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

deployment_id: string
(maxLength: 32)
Identifier

Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>

result: { data, includes_container_logs, total }

success: false | true
Whether the API call was successful

cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/deployments/$DEPLOYMENT_ID/history/logs \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY"
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": {
    "data": [
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      {}
    ]
  },
  "success": true
}
Pages
Projects
Domains
pages.projects.domains

Methods


Add Domain -> Envelope<{ id, certificate_authority, created_on, 6 more... }>
post
/accounts/{account_id}/pages/projects/{project_name}/domains
Add a new domain for the Pages project.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

Body parameters
name: stringOptional
Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>

result: {
id: stringOptional

certificate_authority: "google" | "lets_encrypt"Optional
created_on: stringOptional
domain_id: stringOptional
name: stringOptional

status: "initializing" | "pending" | "active" | 3 more...Optional

validation_data: { error_message, method, status, 2 more... }Optional

verification_data: { error_message, status }Optional
zone_tag: stringOptional
}

success:
Whether the API call was successful

false
true
cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/domains \
    -H 'Content-Type: application/json' \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
    -d '{
          "name": "example.com"
        }'
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": {
    "name": "example.com"
  },
  "success": true
}

Delete Domain -> Envelope<unknown>
delete
/accounts/{account_id}/pages/projects/{project_name}/domains/{domain_name}
Delete a Pages project's domain.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

domain_name: string
Name of the domain.

Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>
result: unknown

success: false | true
Whether the API call was successful

cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/domains/$DOMAIN_NAME \
    -X DELETE \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY"
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": {},
  "success": true
}

Patch Domain -> Envelope<{ id, certificate_authority, created_on, 6 more... }>
patch
/accounts/{account_id}/pages/projects/{project_name}/domains/{domain_name}
Retry the validation status of a single domain.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

domain_name: string
Name of the domain.

Body parameters
body: unknown
Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>

result: { id, certificate_authority, created_on, 6 more... }

success: false | true
Whether the API call was successful

cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/domains/$DOMAIN_NAME \
    -X PATCH \
    -H 'Content-Type: application/json' \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY" \
    -d '{}'
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": {
    "name": "example.com"
  },
  "success": true
}

Get Domain -> Envelope<{ id, certificate_authority, created_on, 6 more... }>
get
/accounts/{account_id}/pages/projects/{project_name}/domains/{domain_name}
Fetch a single domain.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Read Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

domain_name: string
Name of the domain.

Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>

result: { id, certificate_authority, created_on, 6 more... }

success: false | true
Whether the API call was successful

cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/domains/$DOMAIN_NAME \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY"
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": {
    "name": "example.com"
  },
  "success": true
}

Get Domains -> SinglePage<{ id, certificate_authority, created_on, 6 more... }>
get
/accounts/{account_id}/pages/projects/{project_name}/domains
Fetch a list of all domains associated with a Pages project.

Security
API Token
The preferred authorization scheme for interacting with the Cloudflare API. Create a token.

Example: Authorization: Bearer Sn3lZJTBX6kkg7OdcBUAxOO963GEIyGQqnFTOFYY

Accepted Permissions (at least one required)
Pages Read Pages Write

path Parameters
account_id: string
(maxLength: 32)
Identifier

project_name: string
Name of the project.

Response fields
errors: Array<ResponseInfo>
messages: Array<ResponseInfo>
result: Array<{ id, certificate_authority, created_on, 6 more... }>

success: false | true
Whether the API call was successful


result_info: { count, page, per_page, 2 more... }Optional
cURL

curl https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME/domains \
    -H "X-Auth-Email: $CLOUDFLARE_EMAIL" \
    -H "X-Auth-Key: $CLOUDFLARE_API_KEY"
200
Example

{
  "errors": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "messages": [
    {
      "code": 1000,
      "message": "message",
      "documentation_url": "documentation_url",
      "source": {
        "pointer": "pointer"
      }
    }
  ],
  "result": [
    {
      "name": "example.com"
    }
  ],
  "success": true,
  "result_info": {
    "count": 1,
    "page": 1,
    "per_page": 100,
    "total_count": 1,
    "total_pages": 1
  }
}
