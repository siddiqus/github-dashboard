type ApiResponseDataMapperFunction<T> = (response: any) => T[];
type ApiPaginationDataFromResponseFunction = (response: any) => {
  total: number;
};

export async function getPaginatedApiData<ApiResponse, MapperResponse>({
  getObjectsFromResponseData,
  getPagination,
  limit,
  callApi,
  resourceName,
}: {
  getObjectsFromResponseData: ApiResponseDataMapperFunction<MapperResponse>;
  getPagination: ApiPaginationDataFromResponseFunction;
  callApi: (page: number) => Promise<ApiResponse>;
  limit?: number;
  resourceName?: string;
}) {
  let page = 1;
  const pageLimit = limit || 10;
  const data = await callApi(page);

  const objects = getObjectsFromResponseData(data);
  if (!data || !objects) {
    throw new Error(
      resourceName
        ? `Could not fetch ${resourceName} data`
        : "Could not fetch data"
    );
  }

  const pagination = getPagination(data);
  if (pagination.total <= pageLimit) {
    return objects;
  }

  const numberOfPages = Math.ceil(pagination.total / pageLimit);

  const promises: Promise<ApiResponse>[] = [];
  for (page = page + 1; page < numberOfPages + 1; page++) {
    promises.push(callApi(page));
  }

  const responses = await Promise.all(promises);

  responses.forEach((response) => {
    const objs = getObjectsFromResponseData(response) as any[];
    if (!response || !objs) {
      throw new Error(
        resourceName
          ? `Could not fetch ${resourceName} data`
          : "Could not fetch data"
      );
    }
    objects.push(...objs);
  });

  return objects;
}
