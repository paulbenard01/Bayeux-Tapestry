declare module "*.yaml" {
  const data: unknown;
  export default data;
}

declare module "*.svg?raw" {
  const markup: string;
  export default markup;
}
