# Change Log

## 0.6.1 - 2023-03-14

### Updated
- Upgrade dependency `@azure/arm-appplatform` to the latest.

## 0.6.0 - 2023-03-02

### Added
- Add support for viewing live information(beans, mappings, memory graph) from your running application with `Spring Boot Dashboard` extension.

## 0.5.0 - 2022-11-02

### Added
- Add support for remote debugging

## 0.4.0 - 2022-05-23

### Added
- Add support for enterprise tier
- Add support for 0.5Gi memory and 0.5vCUP

### Updated
- improve performance by lazy-loading and cache

## 0.3.0 - 2022-05-09

### Updated
- modify all `Azure Spring Cloud` text to `Azure Spring Apps` since `Azure Spring Cloud` is to be renamed as `Azure Spring Apps`

## 0.2.0 - 2021-06-30

### Updated
- All available commands are now accessible from Command Palette


## 0.1.0 - 2021-01-08

### Added
- Manage Azure Spring Cloud service instance in Azure Explorer
    - Create from portal
    - Delete
- Manage Azure Spring Cloud apps in Azure Explorer
    - Create/Delete/Start/Stop/Restart apps
    - Assign/un-assign public endpoint
    - Access public/test endpoint
    - Scale (vCPU, memory, instance count)
    - Manage environment variables
    - Manage JVM options
- Deploy apps
    - Jar deploy for Java app
- Monitoring and troubleshooting apps
    - App Status (running/updating…)
    - Start/Stop log streaming
