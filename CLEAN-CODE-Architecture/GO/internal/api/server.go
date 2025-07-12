package api

import (
	"auth-module/config"
	"auth-module/internal/api/rest"
	"auth-module/internal/api/rest/handlers"
	"auth-module/internal/helper"
	"auth-module/internal/infrastructure/database/models"
	"auth-module/pkg/payment"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func StartServer(config config.AppConfig) {
	// Set Gin to release mode in production
	gin.SetMode(gin.ReleaseMode)
	
	app := gin.Default()

	db, err := gorm.Open(postgres.Open(config.Dsn), &gorm.Config{})

	if err != nil {
		log.Fatalf("database connection error %v\n", err)
	}

	log.Println("database connected")

	// run migration
	err = db.AutoMigrate(
		&models.UserModel{},
		// Add other infrastructure models here when you create them
		// &models.AddressModel{},
		// &models.BankAccountModel{},
		// &models.CategoryModel{},
		// &models.ProductModel{},
		// &models.CartModel{},
		// &models.OrderModel{},
		// &models.OrderItemModel{},
		// &models.PaymentModel{},
	)
	if err != nil {
		log.Fatalf("error on runing migration %v", err.Error())
	}

	log.Println("migration was successful")

	// cors configuration
	config_cors := cors.DefaultConfig()
	config_cors.AllowOrigins = []string{"http://localhost:3000"}
	config_cors.AllowHeaders = []string{"Content-Type", "Accept", "Authorization"}
	config_cors.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	
	app.Use(cors.New(config_cors))

	app.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "I am Healthy",
			"data": gin.H{
				"status": "ok with 200 status code",
			},
		})
	})

	auth := helper.SetupAuth(config.AppSecret)

	paymentClient := payment.NewPaymentClient(config.StripeSecret)

	rh := &rest.RestHandler{
		App:    app,
		DB:     db,
		Auth:   auth,
		Config: config,
		Pc:     paymentClient,
	}

	setupRoutes(rh)

	log.Fatal(app.Run(":" + config.ServerPort))
}

func setupRoutes(rh *rest.RestHandler) {
	// catalog
	handlers.SetupCatalogRoutes(rh)
	// user handler
	handlers.SetupUserRoutesImpl(rh)
	// transactions
	handlers.SetupTransactionRoutes(rh)
}
