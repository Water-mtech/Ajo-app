type StepProgressProps = {
  steps: string[];
  currentStep: number;
};

export function StepProgress({ steps, currentStep }: StepProgressProps) {
  return (
    <ol className="mb-8 flex items-center">
      {steps.map((label, i) => {
        const isComplete = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs",
                  isComplete
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground",
                ].join(" ")}
              >
                {i + 1}
              </span>
              <span
                className={[
                  "whitespace-nowrap text-[11px]",
                  isCurrent ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={["mx-2 h-px flex-1", isComplete ? "bg-primary" : "bg-border"].join(" ")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
