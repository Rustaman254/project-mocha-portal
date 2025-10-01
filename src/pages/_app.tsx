import type { AppContext, AppProps } from "next/app";
import App from "next/app";
import "@/styles/globals.css";
import ContextProvider from "@/context";
import { NextStep, NextStepProvider } from 'nextstepjs';

const TOUR_KEY = "mainTourCompleted";

function handleTourClose() {
  localStorage.setItem(TOUR_KEY, "true");
}

const steps = [
  {
    tour: "mainTour",
    steps: [
      {
        icon: "👋",
        title: (
          <span style={{ color: "#fff", background: "#18181b", padding: "0.25em 0.5em", borderRadius: "4px" }}>
            Welcome!
          </span>
        ),
        content: (
          <span style={{ color: "#18181b", background: "#fff", fontWeight: 600 }}>
            Welcome to our dashboard! Let's take a quick tour to get you started.
          </span>
        ),
        showControls: true,
        showSkip: true,
        side: "center"
      },
      {
        icon: "💱",
        title: (
          <span style={{ color: "#fff", background: "#18181b", padding: "0.25em 0.5em", borderRadius: "4px" }}>
            Swap for MBT
          </span>
        ),
        content: (
          <span style={{ color: "#18181b", background: "#fff", fontWeight: 600 }}>
            Use this section to swap tokens for MBT, which is needed to invest.
          </span>
        ),
        selector: "#SwapToMbt",
        side: "right",
        showControls: true,
        showSkip: true
      },
      {
        icon: "💸",
        title: (
          <span style={{ color: "#fff", background: "#18181b", padding: "0.25em 0.5em", borderRadius: "4px" }}>
            Invest Now
          </span>
        ),
        content: (
          <span style={{ color: "#18181b", background: "#fff", fontWeight: 600 }}>
            Click on this button to start investing in Trees with your MBT tokens.
          </span>
        ),
        selector: "#InvestNowButton",
        side: "right",
        showControls: true,
        showSkip: true
      }
    ]
  }
];

function MyApp({ Component, pageProps, cookie }: AppProps & { cookie: string | null }) {
  return (
    <NextStepProvider>
      <NextStep steps={steps} onClose={handleTourClose} shadowRgb="0,0,0" shadowOpacity={0.8}>
        <ContextProvider cookies={cookie}>
          <Component {...pageProps} />
        </ContextProvider>
      </NextStep>
    </NextStepProvider>
  );
}

MyApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);
  const { req } = appContext.ctx;
  const cookie = req ? req.headers.cookie || null : null;
  return { ...appProps, cookie };
};

export default MyApp;