/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createFoodPlanNoteFromDiscriminatorValue, createHttpValidationProblemDetailsFromDiscriminatorValue, serializeUpsertFoodPlanNoteRequest, type FoodPlanNote, type HttpValidationProblemDetails, type UpsertFoodPlanNoteRequest } from '../../../../models/index';
// @ts-ignore
import { type BaseRequestBuilder, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/food-plan/notes/{date}
 */
export interface WithDateItemRequestBuilder extends BaseRequestBuilder<WithDateItemRequestBuilder> {
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<FoodPlanNote>}
     * @throws {HttpValidationProblemDetails} error when the service returns a 400 status code
     */
     put(body: UpsertFoodPlanNoteRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<FoodPlanNote | undefined>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toPutRequestInformation(body: UpsertFoodPlanNoteRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const WithDateItemRequestBuilderUriTemplate = "{+baseurl}/api/food-plan/notes/{date}";
/**
 * Metadata for all the requests in the request builder.
 */
export const WithDateItemRequestBuilderRequestsMetadata: RequestsMetadata = {
    put: {
        uriTemplate: WithDateItemRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        errorMappings: {
            400: createHttpValidationProblemDetailsFromDiscriminatorValue as ParsableFactory<Parsable>,
        },
        adapterMethodName: "send",
        responseBodyFactory: createFoodPlanNoteFromDiscriminatorValue,
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeUpsertFoodPlanNoteRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
