/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createFoodPlanNoteFromDiscriminatorValue, type FoodPlanNote } from '../../../models/index';
// @ts-ignore
import { type NotesItemRequestBuilder, NotesItemRequestBuilderRequestsMetadata } from './item/index';
// @ts-ignore
import { type WithDateItemRequestBuilder, WithDateItemRequestBuilderRequestsMetadata } from './dateItem/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/food-plan/notes
 */
export interface NotesRequestBuilder extends BaseRequestBuilder<NotesRequestBuilder> {
    /**
     * Gets an item from the ApiSdk.api.foodPlan.notes.item collection
     * @param noteId Unique identifier of the item
     * @returns {NotesItemRequestBuilder}
     */
     byNoteId(noteId: number) : NotesItemRequestBuilder;
    /**
     * Gets a date-keyed request builder for upsert
     * @param date ISO date string (e.g. "2026-03-25T00:00:00Z")
     * @returns {WithDateItemRequestBuilder}
     */
     byDate(date: string) : WithDateItemRequestBuilder;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<FoodPlanNote[]>}
     */
     get(requestConfiguration?: RequestConfiguration<NotesRequestBuilderGetQueryParameters> | undefined) : Promise<FoodPlanNote[] | undefined>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toGetRequestInformation(requestConfiguration?: RequestConfiguration<NotesRequestBuilderGetQueryParameters> | undefined) : RequestInformation;
}
export interface NotesRequestBuilderGetQueryParameters {
    endDate?: Date;
    startDate?: Date;
}
/**
 * Uri template for the request builder.
 */
export const NotesRequestBuilderUriTemplate = "{+baseurl}/api/food-plan/notes?endDate={endDate}&startDate={startDate}";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const NotesRequestBuilderNavigationMetadata: Record<Exclude<keyof NotesRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    byNoteId: {
        requestsMetadata: NotesItemRequestBuilderRequestsMetadata,
        pathParametersMappings: ["noteId"],
    },
    byDate: {
        requestsMetadata: WithDateItemRequestBuilderRequestsMetadata,
        pathParametersMappings: ["date"],
    },
};
/**
 * Metadata for all the requests in the request builder.
 */
export const NotesRequestBuilderRequestsMetadata: RequestsMetadata = {
    get: {
        uriTemplate: NotesRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "sendCollection",
        responseBodyFactory: createFoodPlanNoteFromDiscriminatorValue,
    },
};
/* tslint:enable */
/* eslint-enable */
