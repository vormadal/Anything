/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createFoodPlanEntryFromDiscriminatorValue, serializeAddFoodPlanEntryRequest, type AddFoodPlanEntryRequest, type FoodPlanEntry } from '../../../../models/index';
// @ts-ignore
import { FoodPlansItemEntriesItemRequestBuilderRequestsMetadata, type FoodPlansItemEntriesItemRequestBuilder } from './item/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/food-plans/{id}/entries
 */
export interface FoodPlansItemEntriesRequestBuilder extends BaseRequestBuilder<FoodPlansItemEntriesRequestBuilder> {
    /**
     * Gets an item from the ApiSdk.api.foodPlans.item.entries.item collection
     * @param entryId Unique identifier of the item
     * @returns {FoodPlansItemEntriesItemRequestBuilder}
     */
     byId(entryId: number) : FoodPlansItemEntriesItemRequestBuilder;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<FoodPlanEntry[]>}
     */
     get(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<FoodPlanEntry[] | undefined>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<FoodPlanEntry>}
     */
     post(body: AddFoodPlanEntryRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<FoodPlanEntry | undefined>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toGetRequestInformation(requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toPostRequestInformation(body: AddFoodPlanEntryRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const FoodPlansItemEntriesRequestBuilderUriTemplate = "{+baseurl}/api/food-plans/{id}/entries";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const FoodPlansItemEntriesRequestBuilderNavigationMetadata: Record<Exclude<keyof FoodPlansItemEntriesRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    byId: {
        requestsMetadata: FoodPlansItemEntriesItemRequestBuilderRequestsMetadata,
        pathParametersMappings: ["entryId"],
    },
};
/**
 * Metadata for all the requests in the request builder.
 */
export const FoodPlansItemEntriesRequestBuilderRequestsMetadata: RequestsMetadata = {
    get: {
        uriTemplate: FoodPlansItemEntriesRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "sendCollection",
        responseBodyFactory: createFoodPlanEntryFromDiscriminatorValue,
    },
    post: {
        uriTemplate: FoodPlansItemEntriesRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory: createFoodPlanEntryFromDiscriminatorValue,
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeAddFoodPlanEntryRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
