package openfga

import (
	"log"

	openfga "github.com/openfga/go-sdk"
)

var Client *openfga.Client

func Init() {
	cfg := openfga.ClientConfiguration{
		ApiScheme: "http",
		ApiHost:   "openfga-http-roopam-latest.apps.dev.jecs.jio.com",
		StoreId:   "01JRWJRPNSD5HS7X58HXKDJB4S",
	}

	var err error
	Client, err = openfga.NewSdkClient(cfg)
	if err != nil {
		log.Fatalf("failed to initialize OpenFGA client: %v", err)
	}
}
