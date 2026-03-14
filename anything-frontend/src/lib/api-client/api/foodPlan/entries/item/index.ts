/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { serializeUpdateFoodPlanEntryRequest, type UpdateFoodPlanEntryRequest } from '../../../../models/index';
// @ts-ignore
import { type BaseRequestBuilder, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

export interface FoodPlanEntriesItemRequestBuilder extends BaseRequestBuilder<FoodPlanEntriesItemRequestBuilder> {
     delete(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
     put(body: UpdateFoodPlanEntryRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
     toDeleteRequestInformation(requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
     toPutRequestInformation(body: UpdateFoodPlanEntryRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}

export const FoodPlanEntriesItemRequestBuilderUriTemplate = "{+baseurl}/api/food-plan/entries/{entryId}";

export const FoodPlanEntriesItemRequestBuilderRequestsMetadata: RequestsMetadata = {
    delete: {
        uriTemplate: FoodPlanEntriesItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
    },
    put: {
        uriTemplate: FoodPlanEntriesItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeUpdateFoodPlanEntryRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
