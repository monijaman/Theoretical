package handlers

import (
	"auth-module/config"
	"auth-module/internal/api/rest"
	"auth-module/internal/domain"
	"auth-module/internal/helper"
	"auth-module/internal/repository"
	"auth-module/internal/service"
	"auth-module/pkg/payment"
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type TransactionHandler struct {
	Svc           service.TransactionService
	UserSvc       service.UserService
	PaymentClient payment.PaymentClient
	Config        config.AppConfig
}

func initializeTransactionService(db *gorm.DB, auth helper.Auth) service.TransactionService {
	return service.TransactionService{
		Repo: repository.NewTransactionRepository(db),
		Auth: auth,
	}
}

func SetupTransactionRoutes(as *rest.RestHandler) {

	app := as.App
	svc := initializeTransactionService(as.DB, as.Auth)
	useSvc := service.UserService{
		Repo:   repository.NewUserRepository(as.DB),
		CRepo:  repository.NewCatalogRepository(as.DB),
		Auth:   as.Auth,
		Config: as.Config,
	}

	handler := TransactionHandler{
		Svc:           svc,
		PaymentClient: as.Pc,
		UserSvc:       useSvc,
		Config:        as.Config,
	}

	secRoute := app.Group("/buyer", as.Auth.Authorize)
	secRoute.GET("/payment", handler.MakePayment)
	secRoute.GET("/verify", handler.VerifyPayment)

	sellerRoute := app.Group("/seller", as.Auth.AuthorizeSeller)
	sellerRoute.GET("/orders", handler.GetOrders)
	sellerRoute.GET("/orders/:id", handler.GetOrderDetails)
}

func (h *TransactionHandler) MakePayment(ctx *gin.Context) {
	//1 grab authorized user
	user := h.Svc.Auth.GetCurrentUser(ctx)

	pubKey := h.Config.PubKey

	// 2. Check if user has an active payment session then return the payment url
	activePayment, err := h.Svc.GetActivePayment(user.ID)
	if activePayment.ID > 0 {
		ctx.JSON(http.StatusOK, gin.H{
			"message": "create payment",
			"pubKey":  pubKey,
			"secret":  activePayment.ClientSecret,
		})
		return
	}

	//3. call user service get cart data to aggregate the total amount and collect payment
	_, amount, err := h.UserSvc.FindCart(user.ID)

	// Convert amount to float64 if it's an interface{}
	amountFloat, ok := amount.(float64)
	if !ok {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "invalid amount type"})
		return
	}

	orderId, err := helper.RandomNumbers(8)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "error generating order id"})
		return
	}

	// 4. Create a new payment session on stripe
	paymentResult, err := h.PaymentClient.CreatePayment(amountFloat, user.ID, orderId)

	//5. Store payment session in db to create to store payment info
	payment := &domain.Payment{
		OrderID:      0, // Will be set when order is created
		Amount:       amountFloat,
		ClientSecret: paymentResult.ClientSecret,
		PaymentID:    paymentResult.ID,
		Status:       "pending",
	}
	err = h.Svc.StoreCreatedPayment(payment)

	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{
		"message": "create payment",
		"pubKey":  pubKey,
		"secret":  paymentResult.ClientSecret,
	})
}

func (h *TransactionHandler) VerifyPayment(ctx *gin.Context) {
	// grab authorized user
	user := h.Svc.Auth.GetCurrentUser(ctx)

	// do we have active payment session to verify?
	activePayment, err := h.Svc.GetActivePayment(user.ID)
	if err != nil || activePayment.ID == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "no active payment exist"})
		return
	}

	// fetch payment status from stripe
	paymentRes, err := h.PaymentClient.GetPaymentStatus(activePayment.PaymentID)
	paymentJson, _ := json.Marshal(paymentRes)
	paymentLogs := string(paymentJson)
	paymentStatus := "failed"

	// if payment then create order
	if paymentRes.Status == "succeeded" {
		// create Order
		paymentStatus = "success"
		orderData := map[string]interface{}{
			"payment_id": activePayment.PaymentID,
			"amount":     activePayment.Amount,
			"order_id":   activePayment.OrderID,
		}
		_, err = h.UserSvc.CreateOrder(user.ID, orderData)
	}

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// update payment status
	h.Svc.UpdatePayment(user.ID, paymentStatus, paymentLogs)

	ctx.JSON(http.StatusOK, gin.H{
		"message":  "create payment",
		"response": paymentRes,
	})
}

func (h *TransactionHandler) GetOrders(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{"message": "success"})
}

func (h *TransactionHandler) GetOrderDetails(ctx *gin.Context) {
	ctx.JSON(http.StatusOK, gin.H{"message": "success"})
}
