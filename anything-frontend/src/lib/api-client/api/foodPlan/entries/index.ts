/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createFoodPlanEntryFromDiscriminatorValue, serializeAddFoodPlanEntryRequest, type AddFoodPlanEntryRequest, type FoodPlanEntry } from '../../../models/index';
// @ts-ignore
import { FoodPlanEntriesItemRequestBuilderRequestsMetadata, type FoodPlanEntriesItemRequestBuilder } from './item/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

export interface FoodPlanEntriesRequestBuilderGetQueryParameters {
    startDate?: string;
    endDate?: string;
}

export interface FoodPlanEntriesRequestBuilder extends BaseRequestBuilder<FoodPlanEntriesRequestBuilder> {
     byId(entryId: number) : FoodPlanEntriesItemRequestBuilder;
     get(requestConfiguration?: RequestConfiguration<FoodPlanEntriesRequestBuilderGetQueryParameters> | undefined) : Promise<FoodPlanEntry[] | undefined>;
     post(body: AddFoodPlanEntryRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<FoodPlanEntry | undefined>;
     toGetRequestInformation(requestConfiguration?: RequestConfiguration<FoodPlanEntriesRequestBuilderGetQueryParameters> | undefined) : RequestInformation;
     toPostRequestInformation(body: AddFoodPlanEntryRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}

export const FoodPlanEntriesRequestBuilderUriTemplate = "{+baseurl}/api/food-plan/entries{?startDate,endDate}";

export const FoodPlanEntriesRequestBuilderNavigationMetadata: Record<Exclude<keyof FoodPlanEntriesRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    byId: {
        requestsMetadata: FoodPlanEntriesItemRequestBuilderRequestsMetadata,
        pathParametersMappings: ["entryId"],
    },
};

export const FoodPlanEntriesRequestBuilderRequestsMetadata: RequestsMetadata = {
    get: {
        uriTemplate: FoodPlanEntriesRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "sendCollection",
        responseBodyFactory: createFoodPlanEntryFromDiscriminatorValue,
    },
    post: {
        uriTemplate: FoodPlanEntriesRequestBuilderUriTemplate,
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
