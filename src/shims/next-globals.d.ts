// Types the ported handlers and pages still reference from the old framework.
declare global {
  type RouteContext<_T extends string = string> = { params: Promise<any> };
  type PageProps<_T extends string = string> = { params: Promise<any>; searchParams: Promise<Record<string, string | string[] | undefined>> };
  type LayoutProps<_T extends string = string> = { children: import("react").ReactNode; params: Promise<any> };
}
export {};
