/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createFoodPlanFromDiscriminatorValue, serializeUpdateFoodPlanRequest, type FoodPlan, type UpdateFoodPlanRequest } from '../../../models/index';
// @ts-ignore
import { FoodPlansItemEntriesRequestBuilderNavigationMetadata, FoodPlansItemEntriesRequestBuilderRequestsMetadata, type FoodPlansItemEntriesRequestBuilder } from './entries/index';
// @ts-ignore
import { FoodPlansItemAddToShoppingListRequestBuilderRequestsMetadata, type FoodPlansItemAddToShoppingListRequestBuilder } from './addToShoppingList/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/food-plans/{id}
 */
export interface FoodPlansItemRequestBuilder extends BaseRequestBuilder<FoodPlansItemRequestBuilder> {
    /**
     * The entries property
     */
    get entries(): FoodPlansItemEntriesRequestBuilder;
    /**
     * The addToShoppingList property
     */
    get addToShoppingList(): FoodPlansItemAddToShoppingListRequestBuilder;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     delete(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<FoodPlan>}
     */
     get(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<FoodPlan | undefined>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     put(body: UpdateFoodPlanRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toDeleteRequestInformation(requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
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
     toPutRequestInformation(body: UpdateFoodPlanRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const FoodPlansItemRequestBuilderUriTemplate = "{+baseurl}/api/food-plans/{id}";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const FoodPlansItemRequestBuilderNavigationMetadata: Record<Exclude<keyof FoodPlansItemRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    entries: {
        requestsMetadata: FoodPlansItemEntriesRequestBuilderRequestsMetadata,
        navigationMetadata: FoodPlansItemEntriesRequestBuilderNavigationMetadata,
    },
    addToShoppingList: {
        requestsMetadata: FoodPlansItemAddToShoppingListRequestBuilderRequestsMetadata,
    },
};
/**
 * Metadata for all the requests in the request builder.
 */
export const FoodPlansItemRequestBuilderRequestsMetadata: RequestsMetadata = {
    delete: {
        uriTemplate: FoodPlansItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
    },
    get: {
        uriTemplate: FoodPlansItemRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory: createFoodPlanFromDiscriminatorValue,
    },
    put: {
        uriTemplate: FoodPlansItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeUpdateFoodPlanRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
