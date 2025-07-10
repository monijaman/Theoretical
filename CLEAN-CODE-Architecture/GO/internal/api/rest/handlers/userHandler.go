package handlers

import (
	"auth-module/internal/api/rest"
	"auth-module/internal/dto"
	"auth-module/internal/repository"
	"auth-module/internal/service"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type UserHandlerImpl struct {
	svc service.UserService
}

func SetupUserRoutesImpl(rh *rest.RestHandler) {
	app := rh.App

	// create an instance of user service & inject to handler
	svc := service.UserService{
		Repo:   repository.NewUserRepository(rh.DB),
		CRepo:  repository.NewCatalogRepository(rh.DB),
		Auth:   rh.Auth,
		Config: rh.Config,
	}
	handler := UserHandlerImpl{
		svc: svc,
	}

	pubRoutes := app.Group("/")
	// Public endpoints
	pubRoutes.POST("/register", handler.Register)
	pubRoutes.POST("/login", handler.Login)

	pvtRoutes := pubRoutes.Group("/users", rh.Auth.Authorize)

	// Private endpoint
	pvtRoutes.GET("/verify", handler.GetVerificationCode)
	pvtRoutes.POST("/verify", handler.Verify)

	pvtRoutes.POST("/profile", handler.CreateProfile)
	pvtRoutes.GET("/profile", handler.GetProfile)
	pvtRoutes.PATCH("/profile", handler.UpdateProfile)

	pvtRoutes.POST("/cart", handler.AddToCart)
	pvtRoutes.GET("/cart", handler.GetCart)

	pvtRoutes.GET("/order", handler.GetOrders)
	pvtRoutes.GET("/order/:id", handler.GetOrder)

	pvtRoutes.POST("/become-seller", handler.BecomeSeller)
}

func (h *UserHandlerImpl) Register(ctx *gin.Context) {
	user := dto.UserSignup{}
	err := ctx.ShouldBindJSON(&user)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "please provide valid inputs",
		})
		return
	}

	token, err := h.svc.Signup(user)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "error on signup",
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "register",
		"token":   token,
	})
}

func (h *UserHandlerImpl) Login(ctx *gin.Context) {
	loginInput := dto.UserLogin{}
	err := ctx.ShouldBindJSON(&loginInput)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "please provide valid inputs",
		})
		return
	}

	token, err := h.svc.Login(loginInput.Email, loginInput.Password)
	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{
			"message": "please provide correct user id password",
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "login",
		"token":   token,
	})
}

func (h *UserHandlerImpl) GetVerificationCode(ctx *gin.Context) {
	user := h.svc.Auth.GetCurrentUser(ctx)
	log.Println(user)
	// create verification code and update to user profile in DB
	msg, err := h.svc.GetVerificationCode(&user)
	log.Printf("User------------------- %v", user)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "unable to generate verification code",
		})
		return
	}
	log.Println(msg)
	ctx.JSON(http.StatusOK, gin.H{
		"message": msg,
	})
}

func (h *UserHandlerImpl) Verify(ctx *gin.Context) {
	user := h.svc.Auth.GetCurrentUser(ctx)

	// request
	var req dto.VerificationCodeInput

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "please provide a valid input",
		})
		return
	}

	err := h.svc.VerifyCode(user.ID, req.Code)

	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "verified successfully",
	})
}

func (h *UserHandlerImpl) CreateProfile(ctx *gin.Context) {
	user := h.svc.Auth.GetCurrentUser(ctx)
	req := dto.ProfileInput{}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "please provide a valid input",
		})
		return
	}
	log.Printf("User %v", user)
	// create profile

	err := h.svc.CreateProfile(user.ID, req)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "unable to create profile",
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "profile created successfully",
	})
}

func (h *UserHandlerImpl) GetProfile(ctx *gin.Context) {
	user := h.svc.Auth.GetCurrentUser(ctx)
	log.Println(user)

	// call user service and perform get profile
	profile, err := h.svc.GetProfile(user.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "unable to get profile",
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "get profile",
		"profile": profile,
	})
}

func (h *UserHandlerImpl) UpdateProfile(ctx *gin.Context) {
	user := h.svc.Auth.GetCurrentUser(ctx)
	req := dto.ProfileInput{}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "please provide a valid input",
		})
		return
	}

	err := h.svc.UpdateProfile(user.ID, req)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "unable to update profile",
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "profile updated successfully",
	})
}

func (h *UserHandlerImpl) AddToCart(ctx *gin.Context) {
	req := dto.CreateCartRequest{}
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"message": "please provide a valid product and qty",
		})
		return
	}

	user := h.svc.Auth.GetCurrentUser(ctx)

	// call user service and perform create cart
	cartItems, err := h.svc.CreateCart(req, &user)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "cart created successfully",
		"data":    cartItems,
	})
}

func (h *UserHandlerImpl) GetCart(ctx *gin.Context) {
	user := h.svc.Auth.GetCurrentUser(ctx)
	cart, _, err := h.svc.FindCart(user.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": "cart does not exist",
		})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{
		"message": "get cart",
		"cart":    cart,
	})
}

func (h *UserHandlerImpl) GetOrders(ctx *gin.Context) {
	user := h.svc.Auth.GetCurrentUser(ctx)

	orders, err := h.svc.GetOrders(&user)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "get orders",
		"orders":  orders,
	})
}

func (h *UserHandlerImpl) GetOrder(ctx *gin.Context) {
	orderId, _ := strconv.Atoi(ctx.Param("id"))
	user := h.svc.Auth.GetCurrentUser(ctx)

	order, err := h.svc.GetOrderById(uint(orderId), user.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"message": err.Error(),
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "get order by id",
		"order":   order,
	})
}

func (h *UserHandlerImpl) BecomeSeller(ctx *gin.Context) {
	user := h.svc.Auth.GetCurrentUser(ctx)

	req := dto.SellerInput{}
	err := ctx.ShouldBindJSON(&req)
	if err != nil {
		ctx.JSON(400, gin.H{
			"message": "request parameters are not valid",
		})
		return
	}

	token, err := h.svc.BecomeSeller(user.ID, req)

	if err != nil {
		ctx.JSON(http.StatusUnauthorized, gin.H{
			"message": "fail to become seller",
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"message": "become seller",
		"token":   token,
	})
}
