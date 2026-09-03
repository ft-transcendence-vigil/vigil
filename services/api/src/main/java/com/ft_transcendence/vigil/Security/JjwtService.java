package com.ft_transcendence.vigil.Security;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;

@Service
public class JjwtService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${jwt.secret}")
    private String key;

    @Value("${jwt.expiration}")
    private long expiration;

    @Value("${jwt.refrech_expiration}")
    private long refrechTokenExpiration;

    public String generateToken(UserDetails userDetails) {
        String role = userDetails.getAuthorities().stream().findFirst().get().getAuthority();

        Date now = new Date();
        Date expirationDate = new Date(now.getTime() + expiration);

        SecretKey secretKey = createSecretKey();

        return Jwts.builder()
                .claim("ROLE", role)
                .subject(userDetails.getUsername())
                .issuedAt(now)
                .expiration(expirationDate)
                .signWith(secretKey)
                .compact();
    }
    public String getUserName(String accessToken) {

            return Jwts.parser().
                    verifyWith(createSecretKey()).
                    build().
                    parseSignedClaims(accessToken).
                    getPayload().
                    getSubject();
    }



    public boolean isTokenExpired(String accesToken)
    {
        Date date = Jwts.parser().verifyWith(createSecretKey()).build().parseSignedClaims(accesToken).getPayload().getExpiration();
        return (new Date().after(date));
    }

    public boolean isTokenValid(String accesToken,UserDetails userDetails)
    {
        try {
        String userName = getUserName(accesToken);
        return userDetails.getUsername().equals(userName) && !isTokenExpired(accesToken);
        }
        catch (JwtException e)
        {
            return false;
    }
        }

    public SecretKey createSecretKey()
    {
        return Keys.hmacShaKeyFor(key.getBytes(StandardCharsets.UTF_8));
    }

    public String generateRefreshToken()
    {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String hashRefreshToken(String rawRefreshToken)
    {
        try {
            byte[] digest = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(rawRefreshToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public long getRefrechTokenExpiration() {
        return refrechTokenExpiration;
    }
}

