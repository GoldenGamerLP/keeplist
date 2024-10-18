import { findSimilarUsers } from "~/server/utils/authUtils";

export default eventHandler(async (event) => {
    const { id } = getQuery(event);

    if(!id && typeof id !== "string") {
        return {
            statusCode: 400,
            body: "Bad request",
        };
    }

    if(id.toString().length < 3) {
        return [];
    }

    return await findSimilarUsers(id.toString());
});