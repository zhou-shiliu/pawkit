export type CareNeedAction = 'feed' | 'water' | 'pet';
export type CareNeedSeverity = 'gentle' | 'urgent';

export interface CareNeedPresentation {
  action: CareNeedAction;
  severity: CareNeedSeverity;
  prompt: string;
  menuSummary: string;
  trayTitle: string;
}

export function getPrimaryCareNeedPresentation(
  state:
    | {
        hunger?: number;
        hydration?: number;
        happiness?: number;
      }
    | null
    | undefined,
): CareNeedPresentation | null;

export function getCareActionLabel(
  action: CareNeedAction,
  recommendedAction?: CareNeedAction | null,
): string;

declare const carePresentation: {
  GENTLE_THRESHOLD: number;
  URGENT_THRESHOLD: number;
  getPrimaryCareNeedPresentation: typeof getPrimaryCareNeedPresentation;
  getCareActionLabel: typeof getCareActionLabel;
};

export default carePresentation;
