package openfga

import (
	"context"
	"fmt"
)

const ModelID = "01JRWJRZ2722X6G9EK8H750V9W"

func CanViewCluster(ctx context.Context, userID, cluster string) (bool, error) {
	resp, err := Client.Check(ctx).
		User(userID).
		Relation("view").
		Object(fmt.Sprintf("cluster:%s", cluster)).
		ModelId(ModelID).
		Execute()

	if err != nil {
		return false, err
	}

	return resp.GetAllowed(), nil
}
