package com.ft_transcendence.vigil.security;
import com.ft_transcendence.vigil.domain.entities.UserPrincipal;
import com.ft_transcendence.vigil.exceptions.UnauthorizedException;
import com.ft_transcendence.vigil.services.UserDetailsServiceImpl;
import com.ft_transcendence.vigil.configuration.VigilProperties;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@Component
@Slf4j
public class JjwtAuthFilter extends OncePerRequestFilter {
    private final JjwtService jjwtService;
    private final UserDetailsServiceImpl userDetailsService;
    private final VigilProperties vigilProperties;
    private final HandlerExceptionResolver exceptionResolver;

    public JjwtAuthFilter(
            JjwtService jjwtService,
            UserDetailsServiceImpl userDetailsService,
            VigilProperties vigilProperties,
            @Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver
    ) {
        this.jjwtService = jjwtService;
        this.userDetailsService = userDetailsService;
        this.vigilProperties = vigilProperties;
        this.exceptionResolver = exceptionResolver;
    }

    // the name of the api key login
    private static final String apiKeyUsername = "Api-Key";
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {


        String header = request.getHeader("Authorization");
        // to handle sse connection
        if (header == null)
        {
            String requestToken = request.getParameter("token");
            if (requestToken != null)
            {
                if (requestToken.equals(vigilProperties.getApiKey()))
                {
                    UsernamePasswordAuthenticationToken authToken = UsernamePasswordAuthenticationToken.authenticated(apiKeyUsername,null, List.of(new SimpleGrantedAuthority("ROLE_admin")));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
                else {
                    String username = null;
                    try
                    {
                        username = jjwtService.getUserName(requestToken);
                        UserPrincipal user = (UserPrincipal) userDetailsService.loadUserByUsername(username);
                        if (jjwtService.isTokenValid(requestToken, user)) {
                            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
                            SecurityContextHolder.getContext().setAuthentication(authToken);
                        } else {
                            exceptionResolver.resolveException(request, response, null,
                                    new UnauthorizedException("Invalid or expired access token"));
                            return;
                        }
                    }
                    catch (JwtException | UsernameNotFoundException | IllegalArgumentException e)
                    {
                        log.error(e.getMessage());
                        exceptionResolver.resolveException(request, response, null,
                                new UnauthorizedException("Invalid or expired access token"));
                        return;
                    }

                }
            }
            filterChain.doFilter(request,response);
            return;
        }
        // handles api key connections
        if (header.startsWith("ApiKey "))
        {
            String requestKey = header.substring(7);
            String ourKey = vigilProperties.getApiKey();
            boolean validKey = ourKey != null && MessageDigest.isEqual(
                    requestKey.getBytes(StandardCharsets.UTF_8),
                    ourKey.getBytes(StandardCharsets.UTF_8));

            if (!validKey) {
                exceptionResolver.resolveException(request, response, null,
                        new UnauthorizedException("Invalid API key"));
                return;
            }

            if (validKey && SecurityContextHolder.getContext().getAuthentication() == null)
            {
                UsernamePasswordAuthenticationToken token = UsernamePasswordAuthenticationToken.authenticated(
                        apiKeyUsername, null, List.of(new SimpleGrantedAuthority("ROLE_admin")));
                token.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(token);
            }
            filterChain.doFilter(request,response);
            return;
        }
        // handles access token connections
        if (!header.startsWith("Bearer "))
        {
            exceptionResolver.resolveException(request, response, null,
                    new UnauthorizedException("Invalid authorization header"));
            return;
        }
        String accessToken = header.substring(7);

        try{
            String userName = jjwtService.getUserName(accessToken);
            if (SecurityContextHolder.getContext().getAuthentication() == null)
            {
                UserDetails userDetails = userDetailsService.loadUserByUsername(userName);
                if (jjwtService.isTokenValid(accessToken,userDetails))
                {
                    UsernamePasswordAuthenticationToken token =  UsernamePasswordAuthenticationToken.authenticated(userDetails,null,userDetails.getAuthorities());
                    token.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(token);
                } else {
                    exceptionResolver.resolveException(request, response, null,
                            new UnauthorizedException("Invalid or expired access token"));
                    return;
                }

            }
        }
        catch (JwtException | UsernameNotFoundException | IllegalArgumentException e)
        {
            logger.debug("jwt auth failed",e);
            exceptionResolver.resolveException(request, response, null,
                    new UnauthorizedException("Invalid or expired access token"));
            return;
        }
        filterChain.doFilter(request,response);



    }

}
