package com.visionx.sunflow.auth.service;

import com.visionx.sunflow.auth.dto.AuthResponse;
import com.visionx.sunflow.auth.dto.LoginRequest;
import com.visionx.sunflow.auth.dto.RegisterRequest;
import com.visionx.sunflow.common.exception.ResourceNotFoundException;
import com.visionx.sunflow.common.security.JwtTokenProvider;
import com.visionx.sunflow.user.dto.UserResponse;
import com.visionx.sunflow.user.entity.User;
import com.visionx.sunflow.user.repository.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * =============================================================================
 * SERVICE: AuthService
 * =============================================================================
 * Business service handling user authentication and registration.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        AuthenticationManager authenticationManager,
        JwtTokenProvider jwtTokenProvider
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );

            String token = jwtTokenProvider.generateToken(authentication);
            User user = userRepository.findByUsername(request.username())
                .or(() -> userRepository.findByEmail(request.username()))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

            return AuthResponse.of(token, UserResponse.fromEntity(user));
        } catch (BadCredentialsException ex) {
            throw new BadCredentialsException("Invalid username or password");
        }
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Username is already taken");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email is already registered");
        }

        User user = new User(
            request.username(),
            request.email(),
            passwordEncoder.encode(request.password()),
            request.fullName(),
            request.phone(),
            request.role()
        );

        user = userRepository.save(user);

        Authentication authentication = new UsernamePasswordAuthenticationToken(
            user.getUsername(),
            null,
            java.util.Collections.singletonList(
                new org.springframework.security.core.authority.SimpleGrantedAuthority(user.getRole().getAuthority())
            )
        );

        String token = jwtTokenProvider.generateToken(authentication);
        return AuthResponse.of(token, UserResponse.fromEntity(user));
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        return UserResponse.fromEntity(user);
    }
}

