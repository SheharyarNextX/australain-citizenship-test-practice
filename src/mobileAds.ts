export type RewardedAdsController = {
  destroy: () => void;
  isLoaded: () => boolean;
  showAd: () => Promise<boolean>;
};

export type RewardedAdsOptions = {
  onClosed: () => void;
  onError: () => void;
  onLoaded: () => void;
};

export function createRewardedAdsController(_options: RewardedAdsOptions): RewardedAdsController | null {
  return null;
}
