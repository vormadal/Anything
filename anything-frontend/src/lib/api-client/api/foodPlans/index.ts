/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createFoodPlanFromDiscriminatorValue, serializeCreateFoodPlanRequest, type CreateFoodPlanRequest, type FoodPlan } from '../../models/index';
// @ts-ignore
import { FoodPlansItemRequestBuilderNavigationMetadata, FoodPlansItemRequestBuilderRequestsMetadata, type FoodPlansItemRequestBuilder } from './item/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/food-plans
 */
export interface FoodPlansRequestBuilder extends BaseRequestBuilder<FoodPlansRequestBuilder> {
    /**
     * Gets an item from the ApiSdk.api.foodPlans.item collection
     * @param id Unique identifier of the item
     * @returns {FoodPlansItemRequestBuilder}
     */
     byId(id: number) : FoodPlansItemRequestBuilder;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<FoodPlan[]>}
     */
     get(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<FoodPlan[] | undefined>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<FoodPlan>}
     */
     post(body: CreateFoodPlanRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<FoodPlan | undefined>;
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
     toPostRequestInformation(body: CreateFoodPlanRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const FoodPlansRequestBuilderUriTemplate = "{+baseurl}/api/food-plans";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const FoodPlansRequestBuilderNavigationMetadata: Record<Exclude<keyof FoodPlansRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    byId: {
        requestsMetadata: FoodPlansItemRequestBuilderRequestsMetadata,
        navigationMetadata: FoodPlansItemRequestBuilderNavigationMetadata,
        pathParametersMappings: ["id"],
    },
};
/**
 * Metadata for all the requests in the request builder.
 */
export const FoodPlansRequestBuilderRequestsMetadata: RequestsMetadata = {
    get: {
        uriTemplate: FoodPlansRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "sendCollection",
        responseBodyFactory: createFoodPlanFromDiscriminatorValue,
    },
    post: {
        uriTemplate: FoodPlansRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory: createFoodPlanFromDiscriminatorValue,
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeCreateFoodPlanRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
