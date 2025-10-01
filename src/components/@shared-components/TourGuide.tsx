import React, { useEffect, useState } from "react";
import type { CallBackProps, Step } from "react-joyride";
import Joyride, { EVENTS, STATUS } from "react-joyride";

interface State {
  run: boolean;
  stepIndex: number;
  steps: Step[];
}

interface TourGuideProps {
  start: boolean;
  setStartTour: (value: boolean) => void;
  onTourEnd: () => void;
}

const TourGuide = ({ start, setStartTour, onTourEnd }: TourGuideProps) => {
  const [progress, setProgress] = useState<number>(1);
  const totalSteps: number = 2;

  // Dashboard steps
  const generateSteps = (val: number): Step[] => [
    {
      target: "#quick-action-swap",
      placement: "right",
      content: (
        <div className="p-3">
          <p className="text-xl font-bold">Swap tokens easily here</p>
          <p>Use this quick action section to swap tokens instantly.</p>
          <div className="absolute bottom-2 left-1/2 text-sm text-neutral-400">{val} of {totalSteps}</div>
        </div>
      ),
      styles: { options: { width: 350 } },
    },
    {
      target: "#quick-action-invest",
      placement: "right",
      content: (
        <div className="p-3">
          <p className="text-xl font-bold">Invest quickly here</p>
          <p>Click here to make an MBT investment in just one step.</p>
          <div className="absolute bottom-2 left-1/2 text-sm text-neutral-400">{val} of {totalSteps}</div>
        </div>
      ),
      styles: { options: { width: 350 } },
    }
  ];

  const [{ run, steps }, setState] = useState<State>({
    run: start,
    stepIndex: 0,
    steps: generateSteps(progress),
  });

  useEffect(() => {
    setState((prevState) => ({
      ...prevState,
      steps: generateSteps(progress),
    }));
  }, [progress]);

  useEffect(() => {
    if (start) {
      setState((prevState) => ({
        ...prevState,
        run: true,
        stepIndex: 0,
      }));
    }
  }, [start]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      setState({ steps, run: false, stepIndex: 0 });
      setStartTour(false);
      onTourEnd();
    } else if (([EVENTS.STEP_BEFORE] as string[]).includes(type)) {
      setProgress(index + 1);
    }
  };

  return (
    <Joyride
      continuous
      callback={handleJoyrideCallback}
      run={run}
      steps={steps}
      scrollToFirstStep
      showProgress
      showSkipButton
      styles={{
        options: {
          zIndex: 100,
          arrowColor: "#1F1F1F",
          backgroundColor: "#1F1F1F",
          textColor: "#FFFFFF",
          overlayColor: "rgba(0, 0, 0, 0.7)",
          primaryColor: "#1c7bd4"
        },
        spotlight: {
          border: "2px solid #1c7bd4"
        }
      }}
      locale={{
        back: (
          <p className="font-bold focus:ring-transparent focus-visible:outline-none">{`<-`}</p>
        ),
      }}
    />
  );
};

export default TourGuide;
