// Package models contains database-specific implementations.
// This package is part of the infrastructure layer in Clean Architecture.
package models

import (
	"auth-module/internal/domain/entity"
	"time"
)

// UserModel represents the database model with GORM-specific tags.
// This is an infrastructure concern, separate from the domain entity.
// - Contains GORM-specific tags and database mapping rules
// - Acts as a Data Transfer Object (DTO) between domain and database
// - Keeps infrastructure concerns isolated from domain logic
type UserModel struct {
	ID         uint      `gorm:"primaryKey;autoIncrement"`
	Username   string    `gorm:"type:varchar(100);not null"`
	FirstName  string    `gorm:"type:varchar(100)"`
	LastName   string    `gorm:"type:varchar(100)"`
	Email      string    `gorm:"type:varchar(100);unique;not null"`
	Phone      string    `gorm:"type:varchar(20)"`
	Address    string    `gorm:"type:varchar(255)"`
	Password   string    `gorm:"type:varchar(255);not null"`
	ProfilePic string    `gorm:"type:varchar(255)"`
	CreatedAt  time.Time `gorm:"autoCreateTime"`
	UpdatedAt  time.Time `gorm:"autoUpdateTime"`
}

// ToEntity converts the GORM model to a domain entity.
// This method ensures that infrastructure details don't leak into the domain layer.
// The domain layer remains clean and unaware of how the data is stored.
func (m *UserModel) ToEntity() *entity.User {
	return &entity.User{
		ID:         m.ID,
		Username:   m.Username,
		FirstName:  m.FirstName,
		LastName:   m.LastName,
		Email:      m.Email,
		Phone:      m.Phone,
		Address:    m.Address,
		Password:   m.Password,
		ProfilePic: m.ProfilePic,
		CreatedAt:  m.CreatedAt,
		UpdatedAt:  m.UpdatedAt,
	}
}

// FromEntity converts a domain entity to a GORM model.
// This function handles the infrastructure concern of preparing
// domain data for database storage, keeping the domain entity clean.
func FromEntity(u *entity.User) *UserModel {
	return &UserModel{
		ID:         u.ID,
		Username:   u.Username,
		FirstName:  u.FirstName,
		LastName:   u.LastName,
		Email:      u.Email,
		Phone:      u.Phone,
		Address:    u.Address,
		Password:   u.Password,
		ProfilePic: u.ProfilePic,
		CreatedAt:  u.CreatedAt,
		UpdatedAt:  u.UpdatedAt,
	}
}
