import { FORM_STEPS } from "@/utils/form";
import { Check } from "lucide-react";

// Helper components
export const SectionHeader = ({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-3 mb-6">
    <div className="p-2 rounded-lg bg-primary/10">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

export const StepIndicator = ({
  steps,
  currentStep,
}: {
  steps: typeof FORM_STEPS;
  currentStep: number;
}) => (
  <div className="mb-8">
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1">
          <div className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep === step.id
                  ? "bg-primary border-primary text-white"
                  : currentStep > step.id
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-white border-gray-300 text-gray-500"
              }`}
            >
              {currentStep > step.id ? (
                <Check className="h-5 w-5" />
              ) : (
                <step.icon className="h-5 w-5" />
              )}
            </div>
            <span
              className={`ml-3 text-sm font-medium ${
                currentStep === step.id
                  ? "text-primary"
                  : currentStep > step.id
                  ? "text-green-500"
                  : "text-gray-500"
              }`}
            >
              {step.title}
            </span>
          </div>
          {index < FORM_STEPS.length - 1 && (
            <div
              className={`w-full h-0.5 mx-4 ${
                currentStep > step.id ? "bg-green-500" : "bg-gray-300"
              }`}
            />
          )}
        </div>
      ))}
    </div>
    <div className="mt-4 text-center">
      <h2 className="text-xl font-semibold">
        {FORM_STEPS[currentStep - 1].title}
      </h2>
      <p className="text-sm text-muted-foreground">
        {FORM_STEPS[currentStep - 1].description}
      </p>
    </div>
  </div>
);
