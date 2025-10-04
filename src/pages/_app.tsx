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
            Welcome to your dashboard! We'll guide you through the main investment features.
          </span>
        ),
        showControls: true,
        showSkip: true,
        side: "center"
      },
      {
        icon: "📈",
        title: (
          <span style={{ color: "#fff", background: "#18181b", padding: "0.25em 0.5em", borderRadius: "4px" }}>
            Locked MBTs
          </span>
        ),
        content: (
          <span style={{ color: "#18181b", background: "#fff", fontWeight: 600 }}>
            See how many MBT tokens are currently staked in Trees. This is your total MBT investment balance that's locked and earning returns.
          </span>
        ),
        selector: "#statcard-locked-mbts",
        side: "right",
        showControls: true,
        showSkip: true
      },
      {
        icon: "💰",
        title: (
          <span style={{ color: "#fff", background: "#18181b", padding: "0.25em 0.5em", borderRadius: "4px" }}>
            Available MBTs
          </span>
        ),
        content: (
          <span style={{ color: "#18181b", background: "#fff", fontWeight: 600 }}>
            This shows your estimated yearly MBT yield at current rates. It helps you forecast your passive earnings from your investments.
          </span>
        ),
        selector: "#statcard-available-mbts",
        side: "right",
        showControls: true,
        showSkip: true
      },
      {
        icon: "🔮",
        title: (
          <span style={{ color: "#fff", background: "#18181b", padding: "0.25em 0.5em", borderRadius: "4px" }}>
            MBTs Cumulative Return
          </span>
        ),
        content: (
          <span style={{ color: "#18181b", background: "#fff", fontWeight: 600 }}>
            Get a 5-year projection of your total MBT returns if you hold your current investments. This forecast assumes today's yield rates and compounding returns.
          </span>
        ),
        selector: "#statcard-cumulative-return",
        side: "right",
        showControls: true,
        showSkip: true
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
            Use this panel to exchange tokens for MBT tokens, so you can invest or top up your dashboard balance.
          </span>
        ),
        selector: "#SwapToMbt",
        side: "right",
        showControls: true,
        showSkip: true
      },
      {
        icon: "🌱",
        title: (
          <span style={{ color: "#fff", background: "#18181b", padding: "0.25em 0.5em", borderRadius: "4px" }}>
            Invest Now
          </span>
        ),
        content: (
          <span style={{ color: "#18181b", background: "#fff", fontWeight: 600 }}>
            Click here to invest your MBT tokens into new Trees and grow your asset portfolio.
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
      <NextStep steps={steps} onEnd={handleTourClose}  onClose={handleTourClose} shadowRgb="0,0,0" shadowOpacity={0.8}>
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