/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { serializeAddFoodPlanToShoppingListRequest, type AddFoodPlanToShoppingListRequest } from '../../../models/index';
// @ts-ignore
import { type BaseRequestBuilder, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

export interface FoodPlanAddToShoppingListRequestBuilder extends BaseRequestBuilder<FoodPlanAddToShoppingListRequestBuilder> {
     post(body: AddFoodPlanToShoppingListRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
     toPostRequestInformation(body: AddFoodPlanToShoppingListRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}

export const FoodPlanAddToShoppingListRequestBuilderUriTemplate = "{+baseurl}/api/food-plan/add-to-shopping-list";

export const FoodPlanAddToShoppingListRequestBuilderRequestsMetadata: RequestsMetadata = {
    post: {
        uriTemplate: FoodPlanAddToShoppingListRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeAddFoodPlanToShoppingListRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
