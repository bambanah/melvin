# Melvin

## Overview

This is an invoice manager for NDIS carer work

## Dev Setup

### Google secrets

- Get "Client ID" and "Client Secret" from [firebase console](https://console.cloud.google.com/apis/credentials/oauthclient/1021588790444-gltkg0e8evqsi245pi0j1fgcp0u73u7f.apps.googleusercontent.com?project=ndis-invoice-gen)
- Add both to .env file under:
  - `GOOGLE_ID`
  - `GOOGLE_SECRET`

### Connect to PlanetScale

- Download [`pscale` CLI](https://github.com/planetscale/cli#installation)
- Sign in and switch to melvin org
  - `pscale login`
  - `pscale org switch melvin`
- Connect to `melvin-dev` branch
  - `pscale connect melvin melvin-dev --port 3309`
- Add `DATABASE_URL="mysql://root@127.0.0.1:3309/melvin"` to local .env file
-
