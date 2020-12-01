export function getSubscriptionFromId(id: string): string {
  const parts = id.split("/");
  return parts[2];
}

export function getResourceGroupFromId(id: string): string {
  const parts = id.split("/");
  return parts[4];
}

export function getServiceNameFromId(id: string): string {
  const parts = id.split("/");
  return parts[8];
}

export function getAppNameFromId(id: string): string {
  const parts = id.split("/");
  return parts[10];
}
