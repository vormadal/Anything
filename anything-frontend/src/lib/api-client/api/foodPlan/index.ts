/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { FoodPlanSettingsRequestBuilderRequestsMetadata, type FoodPlanSettingsRequestBuilder } from './settings/index';
// @ts-ignore
import { FoodPlanEntriesRequestBuilderNavigationMetadata, FoodPlanEntriesRequestBuilderRequestsMetadata, type FoodPlanEntriesRequestBuilder } from './entries/index';
// @ts-ignore
import { FoodPlanAddToShoppingListRequestBuilderRequestsMetadata, type FoodPlanAddToShoppingListRequestBuilder } from './addToShoppingList/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata } from '@microsoft/kiota-abstractions';

export interface FoodPlanRequestBuilder extends BaseRequestBuilder<FoodPlanRequestBuilder> {
    get settings(): FoodPlanSettingsRequestBuilder;
    get entries(): FoodPlanEntriesRequestBuilder;
    get addToShoppingList(): FoodPlanAddToShoppingListRequestBuilder;
}

export const FoodPlanRequestBuilderUriTemplate = "{+baseurl}/api/food-plan";

export const FoodPlanRequestBuilderNavigationMetadata: Record<Exclude<keyof FoodPlanRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    settings: {
        requestsMetadata: FoodPlanSettingsRequestBuilderRequestsMetadata,
    },
    entries: {
        requestsMetadata: FoodPlanEntriesRequestBuilderRequestsMetadata,
        navigationMetadata: FoodPlanEntriesRequestBuilderNavigationMetadata,
    },
    addToShoppingList: {
        requestsMetadata: FoodPlanAddToShoppingListRequestBuilderRequestsMetadata,
    },
};
/* tslint:enable */
/* eslint-enable */
