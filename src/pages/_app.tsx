import type { AppContext, AppProps } from "next/app";
import App from "next/app";
import "@/styles/globals.css";
import ContextProvider from "@/context";

function MyApp({ Component, pageProps, cookie }: AppProps & { cookie: string | null }) {
  return (
    <ContextProvider cookies={cookie}>
      <Component {...pageProps} />
    </ContextProvider>
  );
}

MyApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);
  const { req } = appContext.ctx;
  const cookie = req ? req.headers.cookie || null : null;
  return { ...appProps, cookie };
};

export default MyApp;