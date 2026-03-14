/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createFoodPlanSettingsFromDiscriminatorValue, serializeUpdateFoodPlanSettingsRequest, type FoodPlanSettings, type UpdateFoodPlanSettingsRequest } from '../../../models/index';
// @ts-ignore
import { type BaseRequestBuilder, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

export interface FoodPlanSettingsRequestBuilder extends BaseRequestBuilder<FoodPlanSettingsRequestBuilder> {
     get(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<FoodPlanSettings | undefined>;
     put(body: UpdateFoodPlanSettingsRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<FoodPlanSettings | undefined>;
     toGetRequestInformation(requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
     toPutRequestInformation(body: UpdateFoodPlanSettingsRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}

export const FoodPlanSettingsRequestBuilderUriTemplate = "{+baseurl}/api/food-plan/settings";

export const FoodPlanSettingsRequestBuilderRequestsMetadata: RequestsMetadata = {
    get: {
        uriTemplate: FoodPlanSettingsRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory: createFoodPlanSettingsFromDiscriminatorValue,
    },
    put: {
        uriTemplate: FoodPlanSettingsRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory: createFoodPlanSettingsFromDiscriminatorValue,
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeUpdateFoodPlanSettingsRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
