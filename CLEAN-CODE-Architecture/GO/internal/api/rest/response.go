package rest

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func ErrorMessage(ctx *gin.Context, status int, err error) {
	ctx.JSON(status, gin.H{"error": err.Error()})
}

func InternalError(ctx *gin.Context, err error) {
	ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}

func BadRequestError(ctx *gin.Context, msg string) {
	ctx.JSON(http.StatusBadRequest, gin.H{
		"message": msg,
	})
}

func SuccessResponse(ctx *gin.Context, msg string, data interface{}) {
	ctx.JSON(http.StatusOK, gin.H{
		"message": msg,
		"data":    data,
	})
}
