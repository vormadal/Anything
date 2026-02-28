/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { serializeUpdateFoodPlanEntryRequest, type UpdateFoodPlanEntryRequest } from '../../../../../models/index';
// @ts-ignore
import { type BaseRequestBuilder, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/food-plans/{id}/entries/{entryId}
 */
export interface FoodPlansItemEntriesItemRequestBuilder extends BaseRequestBuilder<FoodPlansItemEntriesItemRequestBuilder> {
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     delete(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     put(body: UpdateFoodPlanEntryRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toDeleteRequestInformation(requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toPutRequestInformation(body: UpdateFoodPlanEntryRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const FoodPlansItemEntriesItemRequestBuilderUriTemplate = "{+baseurl}/api/food-plans/{id}/entries/{entryId}";
/**
 * Metadata for all the requests in the request builder.
 */
export const FoodPlansItemEntriesItemRequestBuilderRequestsMetadata: RequestsMetadata = {
    delete: {
        uriTemplate: FoodPlansItemEntriesItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
    },
    put: {
        uriTemplate: FoodPlansItemEntriesItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeUpdateFoodPlanEntryRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
