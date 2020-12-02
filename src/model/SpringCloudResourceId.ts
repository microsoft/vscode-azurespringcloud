export default class SpringCloudResourceId {
  private readonly parts: string[];

  public constructor(id: string) {
    this.parts = id.split("/");
  }

  public getSubscription(): string {
    return this.parts[2];
  }

  public getResourceGroup(): string {
    return this.parts[4];
  }

  public getServiceName(): string {
    return this.parts[8];
  }

  public getAppName(): string {
    return this.parts[10];
  }
}
