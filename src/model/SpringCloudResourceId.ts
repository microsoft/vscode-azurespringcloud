export default class SpringCloudResourceId {
  private readonly parts: string[];

  public constructor(id: string) {
    this.parts = id.split("/");
  }

  public getSubscription(): string {
    return this.parts[2];
  }

  public get resourceGroup(): string {
    return this.parts[4];
  }

  public get serviceName(): string {
    return this.parts[8];
  }

  public get appName(): string {
    return this.parts[10];
  }
}
