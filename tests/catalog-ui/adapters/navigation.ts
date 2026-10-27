export const usePathname = () => window.location.pathname;
const fixtureRouter = { push: (href: string) => window.location.assign(href),refresh:()=>{} };
export const useRouter = () => fixtureRouter;
