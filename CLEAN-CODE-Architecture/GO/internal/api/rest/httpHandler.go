package rest

import (
	"auth-module/config"
	"auth-module/internal/helper"
	"auth-module/pkg/payment"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type RestHandler struct {
	App    *gin.Engine
	DB     *gorm.DB
	Auth   helper.Auth
	Config config.AppConfig
	Pc     payment.PaymentClient
}
