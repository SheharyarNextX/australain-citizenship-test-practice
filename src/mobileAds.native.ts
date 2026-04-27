import { Platform } from 'react-native';
import mobileAds, { AdEventType, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
import type { RewardedAdsController, RewardedAdsOptions } from './mobileAds';

const IOS_REWARDED_AD_UNIT_ID = 'ca-app-pub-6353513768874790/3758684745';
const ANDROID_REWARDED_AD_UNIT_ID = 'ca-app-pub-6353513768874790/9338314488';
const REWARDED_AD_UNIT_ID = Platform.OS === 'ios' ? IOS_REWARDED_AD_UNIT_ID : ANDROID_REWARDED_AD_UNIT_ID;

export function createRewardedAdsController({
  onClosed,
  onError,
  onLoaded,
}: RewardedAdsOptions): RewardedAdsController {
  const rewarded = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
  let loaded = false;
  let showing = false;

  const load = () => {
    loaded = false;
    rewarded.load();
  };

  const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
    loaded = true;
    onLoaded();
  });
  const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
    loaded = false;
    showing = false;
    onClosed();
    load();
  });
  const unsubscribeError = rewarded.addAdEventListener(AdEventType.ERROR, () => {
    loaded = false;
    showing = false;
    onError();
  });

  mobileAds()
    .initialize()
    .then(load)
    .catch(onError);

  return {
    destroy: () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    },
    isLoaded: () => loaded && !showing,
    showAd: () =>
      new Promise((resolve) => {
        if (!loaded || showing) {
          resolve(false);
          return;
        }

        let settled = false;
        let unsubscribeEarned: () => void = () => undefined;
        let unsubscribeLocalClosed: () => void = () => undefined;
        let unsubscribeLocalError: () => void = () => undefined;
        const timeout = setTimeout(() => finish(true), 90000);

        const finish = (shown: boolean) => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timeout);
          unsubscribeEarned();
          unsubscribeLocalClosed();
          unsubscribeLocalError();
          resolve(shown);
        };

        showing = true;
        unsubscribeEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => undefined);
        unsubscribeLocalClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => finish(true));
        unsubscribeLocalError = rewarded.addAdEventListener(AdEventType.ERROR, () => finish(false));

        rewarded.show().catch(() => finish(false));
      }),
  };
}
