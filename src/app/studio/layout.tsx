import { StudioHeader } from "./studio-header";

export default function StudioLayout({ children }: LayoutProps<"/studio">) {
  return (
    <>
      <StudioHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  );
}
