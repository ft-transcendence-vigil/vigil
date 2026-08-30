package com.ft_transcendence.vigil.Security;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JjwtService {

    @Value("${jwt.secret}")
    private String key;

    @Value("${jwt.expiration}")
    private long expiration;

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
}

