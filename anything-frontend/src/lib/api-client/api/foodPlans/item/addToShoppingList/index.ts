/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { serializeAddFoodPlanToShoppingListRequest, type AddFoodPlanToShoppingListRequest } from '../../../../models/index';
// @ts-ignore
import { type BaseRequestBuilder, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/food-plans/{id}/add-to-shopping-list
 */
export interface FoodPlansItemAddToShoppingListRequestBuilder extends BaseRequestBuilder<FoodPlansItemAddToShoppingListRequestBuilder> {
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     post(body: AddFoodPlanToShoppingListRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toPostRequestInformation(body: AddFoodPlanToShoppingListRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const FoodPlansItemAddToShoppingListRequestBuilderUriTemplate = "{+baseurl}/api/food-plans/{id}/add-to-shopping-list";
/**
 * Metadata for all the requests in the request builder.
 */
export const FoodPlansItemAddToShoppingListRequestBuilderRequestsMetadata: RequestsMetadata = {
    post: {
        uriTemplate: FoodPlansItemAddToShoppingListRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeAddFoodPlanToShoppingListRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
